import {
  EVENT_VERSION,
  statusUpdatedEventId,
  TOPICS,
  type TransactionCreatedEvent,
  transactionCreatedSchema,
  type TransactionStatusUpdatedEvent,
} from '@challenge/contracts';
import { type HandlerDeEvento, KafkaConsumerRunner, KafkaProducer } from '@challenge/messaging';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env';
import { avaliar } from './domain/fraud-rule';

@Injectable()
export class TransactionCreatedConsumer
  implements HandlerDeEvento<TransactionCreatedEvent>, OnModuleInit
{
  private readonly logger = new Logger(TransactionCreatedConsumer.name);

  readonly topico = TOPICS.transactionCreated;
  readonly schema = transactionCreatedSchema;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly runner: KafkaConsumerRunner,
    private readonly producer: KafkaProducer,
  ) {}

  get grupo(): string {
    return this.config.get('KAFKA_GROUP_ID_ANTI_FRAUD', { infer: true });
  }

  onModuleInit(): void {
    this.runner.registrar(this);
  }

  /**
   * Avaliar e publicar, sem nada em disco. O eventId de saida e derivado do identificador da
   * transacao com uuidv5: se este handler rodar duas vezes para a mesma entrada, o evento
   * produzido e byte a byte o mesmo, e a guarda de idempotencia do servico de transacoes
   * descarta o segundo. E o que permite este servico nao ter banco.
   */
  async processar(evento: TransactionCreatedEvent): Promise<void> {
    const { transactionExternalId, value } = evento.payload;
    const veredito = avaliar(value);

    const resultado: TransactionStatusUpdatedEvent = {
      eventId: statusUpdatedEventId(transactionExternalId),
      eventName: TOPICS.transactionStatusUpdated,
      eventVersion: EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      payload: {
        transactionExternalId,
        status: veredito.status,
        reason: veredito.reason,
      },
    };

    this.logger.log(`transacao ${transactionExternalId} de ${value}: ${veredito.status}`);

    await this.producer.publicar(TOPICS.transactionStatusUpdated, transactionExternalId, resultado);
  }
}
