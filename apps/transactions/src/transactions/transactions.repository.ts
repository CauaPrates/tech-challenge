import { Injectable } from '@nestjs/common';
import type { Prisma, Transaction, TransactionType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type TransacaoComTipo = Transaction & { type: TransactionType };

export interface NovaTransacao {
  accountExternalIdDebit: string;
  accountExternalIdCredit: string;
  typeId: number;
  value: Prisma.Decimal;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(tx: Prisma.TransactionClient, dados: NovaTransacao): Promise<TransacaoComTipo> {
    return tx.transaction.create({ data: dados, include: { type: true } });
  }

  async buscarPorExternalId(externalId: string): Promise<TransacaoComTipo | null> {
    return this.prisma.transaction.findUnique({
      where: { externalId },
      include: { type: true },
    });
  }

  async tipoExiste(tx: Prisma.TransactionClient, typeId: number): Promise<boolean> {
    const tipo = await tx.transactionType.findUnique({ where: { id: typeId } });

    return tipo !== null;
  }
}
