import {
  TOPICS,
  type TransactionStatusUpdatedEvent,
  transactionStatusUpdatedSchema,
} from '@challenge/contracts';
import { ErroDefinitivo, type HandlerDeEvento, KafkaConsumerRunner } from '@challenge/messaging';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env';
import { ProcessedEventRepository } from '../messaging/processed-event.repository';
import { PrismaService } from '../prisma/prisma.service';
import { podeTransicionar } from './domain/transaction-status';
import { TransactionsRepository } from './transactions.repository';

const CONSUMIDOR = 'transactions';

@Injectable()
export class StatusUpdatedConsumer
  implements HandlerDeEvento<TransactionStatusUpdatedEvent>, OnModuleInit
{
  private readonly logger = new Logger(StatusUpdatedConsumer.name);

  readonly topico = TOPICS.transactionStatusUpdated;
  readonly schema = transactionStatusUpdatedSchema;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly runner: KafkaConsumerRunner,
    private readonly prisma: PrismaService,
    private readonly transacoes: TransactionsRepository,
    private readonly processados: ProcessedEventRepository,
  ) {}

  get grupo(): string {
    return this.config.get('KAFKA_GROUP_ID_TRANSACTIONS', { infer: true });
  }

  onModuleInit(): void {
    this.runner.registrar(this);
  }

  /**
   * Guarda de idempotencia, lock da linha, maquina de estado e atualizacao — tudo numa transacao
   * so. Isso cobre os tres jeitos de esse evento chegar torto:
   *
   * - entrega duplicada: o registro em processed_event falha o ON CONFLICT e nada e aplicado.
   * - transacao ja finalizada: a maquina de estado recusa e o evento e descartado sem erro.
   * - transacao inexistente: erro definitivo, vai para a DLQ em vez de bloquear a particao.
   */
  async processar(evento: TransactionStatusUpdatedEvent): Promise<void> {
    const { transactionExternalId, status, reason } = evento.payload;

    await this.prisma.$transaction(async (tx) => {
      const primeiraVez = await this.processados.registrar(tx, {
        consumer: CONSUMIDOR,
        eventId: evento.eventId,
        eventName: evento.eventName,
      });

      if (!primeiraVez) {
        this.logger.log(`evento ${evento.eventId} ja processado, descartando duplicata`);
        return;
      }

      const transacao = await this.transacoes.travarPorExternalId(tx, transactionExternalId);

      if (transacao === null) {
        throw new ErroDefinitivo(`transacao ${transactionExternalId} nao existe`);
      }

      if (!podeTransicionar(transacao.status, status)) {
        this.logger.warn(
          `transacao ${transactionExternalId} ja esta em ${transacao.status}, ignorando veredito ${status}`,
        );
        return;
      }

      await this.transacoes.atualizarStatus(tx, transacao.id, status);
      this.logger.log(`transacao ${transactionExternalId} passou a ${status}: ${reason}`);
    });
  }
}
