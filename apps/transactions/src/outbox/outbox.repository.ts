import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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

  async contarPendentes(): Promise<number> {
    return this.prisma.outboxMessage.count({ where: { publishedAt: null } });
  }
}
