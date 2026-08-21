import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface MensagemPendente {
  id: string;
  eventId: string;
  eventName: string;
  aggregateId: string;
  payload: unknown;
  occurredAt: Date;
  attempts: number;
}

export interface NovaMensagemDeOutbox {
  eventId: string;
  eventName: string;
  aggregateId: string;
  payload: Prisma.InputJsonValue;
  occurredAt: Date;
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recebe o cliente da transacao em curso, e nao o PrismaService: e o que garante que a
   * mensagem so exista se o fato que a originou tambem existir.
   */
  async enfileirar(tx: Prisma.TransactionClient, mensagem: NovaMensagemDeOutbox): Promise<void> {
    await tx.outboxMessage.create({ data: mensagem });
  }

  /**
   * Reivindica um lote e ja empurra next_attempt_at para frente, tudo numa transacao curta que
   * commita antes de qualquer publicacao. Sao duas garantias em uma:
   *
   * - FOR UPDATE SKIP LOCKED faz instancias concorrentes receberem lotes disjuntos, sem lock
   *   global e sem coordenacao externa.
   * - o empurrao vira um lease: se este processo morrer depois de reivindicar, a mensagem volta
   *   a ser elegivel quando o lease expirar, em vez de ficar presa.
   *
   * SQL cru porque o Prisma nao expressa clausula de lock.
   */
  async reivindicarLote(
    limite: number,
    maxTentativas: number,
    leaseMs: number,
  ): Promise<MensagemPendente[]> {
    return this.prisma.$transaction(
      async (tx) =>
        tx.$queryRaw<MensagemPendente[]>`
        WITH elegiveis AS (
          SELECT id
            FROM outbox_message
           WHERE published_at IS NULL
             AND attempts < ${maxTentativas}
             AND (next_attempt_at IS NULL OR next_attempt_at <= now())
           ORDER BY occurred_at
           LIMIT ${limite}
             FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_message AS m
           SET next_attempt_at = now() + make_interval(secs => ${leaseMs} / 1000.0)
          FROM elegiveis
         WHERE m.id = elegiveis.id
        RETURNING m.id,
                  m.event_id     AS "eventId",
                  m.event_name   AS "eventName",
                  m.aggregate_id AS "aggregateId",
                  m.payload,
                  m.occurred_at  AS "occurredAt",
                  m.attempts
      `,
    );
  }

  async marcarPublicada(id: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: { publishedAt: new Date(), lastError: null, nextAttemptAt: null },
    });
  }

  async registrarFalha(id: string, erro: string, proximaTentativa: Date): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: erro.slice(0, 1000),
        nextAttemptAt: proximaTentativa,
      },
    });
  }

  async contarPendentes(): Promise<number> {
    return this.prisma.outboxMessage.count({ where: { publishedAt: null } });
  }
}
