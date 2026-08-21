import { EVENT_VERSION, TOPICS, transactionCreatedSchema } from '@challenge/contracts';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ZodType } from 'zod';

import type { Env } from '../config/env';
import { KafkaProducer } from '../messaging/kafka-producer';
import { proximaTentativaEm } from './backoff';
import { type MensagemPendente, OutboxRepository } from './outbox.repository';

/**
 * Envelope malformado nao chega no topico: vira tentativa falha com o erro registrado. Sem
 * isto, um bug no produtor viraria mensagem envenenada no consumidor.
 */
const SCHEMA_POR_EVENTO: Record<string, ZodType> = {
  [TOPICS.transactionCreated]: transactionCreatedSchema,
};

@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private temporizador?: NodeJS.Timeout;
  private despachando = false;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly outbox: OutboxRepository,
    private readonly producer: KafkaProducer,
  ) {}

  onModuleInit(): void {
    this.temporizador = setInterval(
      () => {
        void this.tick();
      },
      this.config.get('OUTBOX_POLL_INTERVAL_MS', { infer: true }),
    );
    // sem unref o processo nao encerra sozinho enquanto o intervalo estiver armado
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
  }

  /** Guarda contra sobreposicao: lote lento nao pode disparar um segundo em paralelo. */
  private async tick(): Promise<void> {
    if (this.despachando) {
      return;
    }

    this.despachando = true;

    try {
      await this.despacharLote();
    } catch (erro) {
      this.logger.error('falha ao despachar lote do outbox', erro);
    } finally {
      this.despachando = false;
    }
  }

  /**
   * Reivindica, commita, e so entao publica. A publicacao acontece FORA de qualquer transacao
   * de banco, por dois motivos aprendidos na pratica:
   *
   * - o kafkajs faz retry interno com recuo proprio, o que estoura com folga o timeout de 5s do
   *   $transaction do Prisma. Publicando dentro, a transacao morre e nem a falha e registrada.
   * - manter transacao aberta durante I/O de rede prende lock de linha por segundos.
   *
   * Em troca, um crash entre publicar e marcar reentrega a mensagem depois. E entrega ao menos
   * uma vez, que e a garantia que o consumo idempotente do outro lado ja assume.
   */
  async despacharLote(): Promise<number> {
    const lote = await this.outbox.reivindicarLote(
      this.config.get('OUTBOX_BATCH_SIZE', { infer: true }),
      this.config.get('OUTBOX_MAX_ATTEMPTS', { infer: true }),
      this.config.get('OUTBOX_LEASE_MS', { infer: true }),
    );

    for (const mensagem of lote) {
      await this.publicarUma(mensagem);
    }

    return lote.length;
  }

  private async publicarUma(mensagem: MensagemPendente): Promise<void> {
    try {
      const envelope = this.montarEnvelope(mensagem);

      await this.producer.publicar(mensagem.eventName, mensagem.aggregateId, envelope);
      await this.outbox.marcarPublicada(mensagem.id);
    } catch (erro) {
      await this.registrarFalha(mensagem, erro);
    }
  }

  private async registrarFalha(mensagem: MensagemPendente, erro: unknown): Promise<void> {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    const tentativa = mensagem.attempts + 1;
    const maxTentativas = this.config.get('OUTBOX_MAX_ATTEMPTS', { infer: true });
    const proxima = proximaTentativaEm(new Date(), mensagem.attempts, {
      baseMs: this.config.get('OUTBOX_BACKOFF_BASE_MS', { infer: true }),
      tetoMs: this.config.get('OUTBOX_BACKOFF_MAX_MS', { infer: true }),
    });

    if (tentativa >= maxTentativas) {
      this.logger.error(
        `evento ${mensagem.eventId} esgotou ${maxTentativas} tentativas e nao sera reenviado: ${motivo}`,
      );
    } else {
      this.logger.warn(
        `evento ${mensagem.eventId} falhou na tentativa ${tentativa}, proxima em ${proxima.toISOString()}: ${motivo}`,
      );
    }

    await this.outbox.registrarFalha(mensagem.id, motivo, proxima);
  }

  private montarEnvelope(mensagem: MensagemPendente): unknown {
    const envelope = {
      eventId: mensagem.eventId,
      eventName: mensagem.eventName,
      eventVersion: EVENT_VERSION,
      occurredAt: mensagem.occurredAt.toISOString(),
      payload: mensagem.payload,
    };

    const schema = SCHEMA_POR_EVENTO[mensagem.eventName];

    if (schema === undefined) {
      throw new Error(`evento ${mensagem.eventName} nao tem schema registrado`);
    }

    return schema.parse(envelope);
  }
}
