import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Producer } from 'kafkajs';

import type { Env } from '../config/env';
import { KafkaTopics } from './kafka-topics';

@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducer.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private conectado = false;

  constructor(
    config: ConfigService<Env, true>,
    private readonly topicos: KafkaTopics,
  ) {
    this.kafka = new Kafka({
      clientId: config.get('KAFKA_CLIENT_ID', { infer: true }),
      brokers: config.get('KAFKA_BROKERS', { infer: true }),
      // retry curto de proposito: o recuo de verdade e o do outbox, que sobrevive a restart do
      // processo. Retry longo aqui so prende o dispatcher e estoura timeout de transacao.
      retry: { retries: 1, initialRetryTime: 100 },
      connectionTimeout: 3000,
      requestTimeout: 5000,
    });
    // idempotente evita duplicata gerada por retry interno do proprio produtor
    this.producer = this.kafka.producer({ idempotent: true });
    this.producer.on(this.producer.events.DISCONNECT, () => {
      this.conectado = false;
    });
  }

  /**
   * Tenta conectar na subida por conveniencia, mas falhar aqui NAO derruba a aplicacao: a API
   * tem de aceitar criacao de transacao com o broker fora. O outbox segura o evento ate o
   * broker voltar, e a reconexao acontece na proxima publicacao.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.garantirConexao();
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);

      this.logger.warn(`broker indisponivel na subida, seguindo sem ele: ${motivo}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.conectado) {
      await this.producer.disconnect();
    }
  }

  /**
   * A chave e o identificador externo da transacao: garante que todos os eventos de uma mesma
   * transacao caem na mesma particao e sao processados em ordem, sem serializar o topico.
   */
  async publicar(topico: string, chave: string, valor: unknown): Promise<void> {
    await this.garantirConexao();
    await this.producer.send({
      topic: topico,
      messages: [{ key: chave, value: JSON.stringify(valor) }],
    });
  }

  private async garantirConexao(): Promise<void> {
    if (this.conectado) {
      return;
    }

    await this.topicos.garantir();
    await this.producer.connect();
    this.conectado = true;
    this.logger.log('produtor conectado');
  }
}
