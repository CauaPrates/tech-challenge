import type { FinalTransactionStatus } from '@challenge/contracts';
import { Injectable } from '@nestjs/common';
import type { Prisma, Transaction, TransactionStatus, TransactionType } from '@prisma/client';

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

  /**
   * SELECT ... FOR UPDATE: torna atomico o ciclo ler status, decidir transicao, gravar. Sem o
   * lock, dois vereditos concorrentes para a mesma transacao poderiam ler o mesmo PENDENTE e
   * ambos concluir que podem escrever.
   */
  async travarPorExternalId(
    tx: Prisma.TransactionClient,
    externalId: string,
  ): Promise<{ id: string; status: TransactionStatus } | null> {
    const linhas = await tx.$queryRaw<{ id: string; status: TransactionStatus }[]>`
      SELECT id, status FROM transaction WHERE external_id = ${externalId}::uuid FOR UPDATE
    `;

    return linhas[0] ?? null;
  }

  async atualizarStatus(
    tx: Prisma.TransactionClient,
    id: string,
    status: FinalTransactionStatus,
  ): Promise<void> {
    await tx.transaction.update({ where: { id }, data: { status } });
  }

  /**
   * A pagina e a contagem saem da mesma transacao: sem isso, uma escrita no meio produziria uma
   * pagina que nao corresponde ao total informado.
   */
  async listar(
    where: Prisma.TransactionWhereInput,
    page: number,
    pageSize: number,
  ): Promise<{ itens: TransacaoComTipo[]; total: number }> {
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { type: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { itens, total };
  }

  async listarTipos(): Promise<{ id: number; name: string }[]> {
    return this.prisma.transactionType.findMany({ orderBy: { id: 'asc' } });
  }

  /** GROUP BY no banco: uma consulta em vez de uma por status. */
  async contarPorStatus(): Promise<{ status: TransactionStatus; total: number }[]> {
    const grupos = await this.prisma.transaction.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return grupos.map((grupo) => ({ status: grupo.status, total: grupo._count._all }));
  }

  async tipoExiste(tx: Prisma.TransactionClient, typeId: number): Promise<boolean> {
    const tipo = await tx.transactionType.findUnique({ where: { id: typeId } });

    return tipo !== null;
  }
}
