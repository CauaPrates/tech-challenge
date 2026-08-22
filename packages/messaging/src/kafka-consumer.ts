import { deadLetterTopic, type Topic } from '@challenge/contracts';
import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { type Consumer, type EachMessagePayload, Kafka } from 'kafkajs';
import type { ZodType } from 'zod';

import { ErroDefinitivo } from './erros';
import { KafkaProducer } from './kafka-producer';
import { KAFKA_OPCOES, type KafkaOpcoes } from './opcoes';

export interface HandlerDeEvento<T> {
  readonly topico: Topic;
  readonly grupo: string;
  readonly schema: ZodType<T>;
  processar(envelope: T): Promise<void>;
}

interface ContextoDaFalha {
  topico: string;
  particao: number;
  offset: string;
  tentativas: number;
  bruto: string | undefined;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@Injectable()
export class KafkaConsumerRunner implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerRunner.name);
  private readonly kafka: Kafka;
  private readonly consumidores: Consumer[] = [];
  private encerrando = false;

  constructor(
    @Inject(KAFKA_OPCOES) private readonly opcoes: KafkaOpcoes,
    private readonly producer: KafkaProducer,
  ) {
    this.kafka = new Kafka({
      clientId: `${opcoes.clientId}-consumer`,
      brokers: opcoes.brokers,
      retry: { retries: 1, initialRetryTime: 100 },
      connectionTimeout: 3000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.encerrando = true;
    await Promise.all(this.consumidores.map((consumidor) => consumidor.disconnect()));
  }

  /**
   * Broker indisponivel na subida nao derruba o servico: reagenda e tenta de novo. Um consumidor
   * que morre no boot porque o Kafka ainda esta subindo transforma ordem de inicializacao em
   * requisito, e isso nao se sustenta em producao.
   */
  registrar<T>(handler: HandlerDeEvento<T>): void {
    void this.conectarComRetentativa(handler);
  }

  private async conectarComRetentativa<T>(handler: HandlerDeEvento<T>): Promise<void> {
    while (!this.encerrando) {
      try {
        await this.assinar(handler);
        this.logger.log(`consumindo ${handler.topico} no grupo ${handler.grupo}`);
        return;
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.message : String(erro);

        this.logger.warn(
          `nao foi possivel assinar ${handler.topico}, nova tentativa em ${this.opcoes.reconexaoMs}ms: ${motivo}`,
        );
        await esperar(this.opcoes.reconexaoMs);
      }
    }
  }

  private async assinar<T>(handler: HandlerDeEvento<T>): Promise<void> {
    const consumidor = this.kafka.consumer({ groupId: handler.grupo });

    await consumidor.connect();
    await consumidor.subscribe({ topic: handler.topico, fromBeginning: true });
    await consumidor.run({
      eachMessage: (payload) => this.processarMensagem(handler, payload),
    });

    this.consumidores.push(consumidor);
  }

  /**
   * Confirmar ou nao o offset e a decisao inteira deste metodo:
   *
   * - sucesso: retorna, o kafkajs confirma, a mensagem nao volta.
   * - falha definitiva: vai para a DLQ e confirma, para nao travar a particao.
   * - falha transitoria que nao cede: relanca SEM confirmar, e o Kafka reentrega depois. Um
   *   consumidor visivelmente parado e melhor que uma mensagem descartada em silencio.
   */
  private async processarMensagem<T>(
    handler: HandlerDeEvento<T>,
    { topic, partition, message }: EachMessagePayload,
  ): Promise<void> {
    const bruto = message.value?.toString('utf8');
    const contexto: ContextoDaFalha = {
      topico: topic,
      particao: partition,
      offset: message.offset,
      tentativas: 0,
      bruto,
    };

    let envelope: T;

    try {
      envelope = handler.schema.parse(JSON.parse(bruto ?? ''));
    } catch (erro) {
      // payload invalido nunca melhora com reentrega
      await this.enviarParaDlq(handler.topico, { ...contexto, tentativas: 1 }, erro);
      return;
    }

    for (let tentativa = 1; ; tentativa += 1) {
      try {
        await handler.processar(envelope);
        return;
      } catch (erro) {
        if (erro instanceof ErroDefinitivo) {
          await this.enviarParaDlq(handler.topico, { ...contexto, tentativas: tentativa }, erro);
          return;
        }

        if (tentativa >= this.opcoes.maxTentativas) {
          this.logger.error(
            `falha transitoria persistente em ${topic} offset ${message.offset} apos ${tentativa} tentativas; offset nao sera confirmado`,
            erro instanceof Error ? erro.stack : undefined,
          );
          throw erro;
        }

        const atraso = Math.min(
          this.opcoes.backoffBaseMs * 2 ** (tentativa - 1),
          this.opcoes.backoffMaxMs,
        );

        this.logger.warn(
          `tentativa ${tentativa} falhou em ${topic} offset ${message.offset}, nova em ${atraso}ms`,
        );
        await esperar(atraso);
      }
    }
  }

  /** O envelope original vai inteiro, para reprocessar a partir da DLQ ser possivel. */
  private async enviarParaDlq(
    topicoOrigem: Topic,
    contexto: ContextoDaFalha,
    erro: unknown,
  ): Promise<void> {
    const destino = deadLetterTopic(topicoOrigem);
    const nome = erro instanceof Error ? erro.name : 'Error';
    const motivo = erro instanceof Error ? erro.message : String(erro);

    this.logger.error(`enviando para ${destino}: ${nome}: ${motivo}`);

    await this.producer.publicar(destino, contexto.offset, {
      failedAt: new Date().toISOString(),
      consumer: this.opcoes.clientId,
      sourceTopic: contexto.topico,
      partition: contexto.particao,
      offset: contexto.offset,
      attempts: contexto.tentativas,
      error: { name: nome, message: motivo },
      original: contexto.bruto,
    });
  }
}
