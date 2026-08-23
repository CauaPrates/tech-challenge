import { type ListTransactionsQuery, STATUS_BY_NAME } from '@challenge/contracts';
import type { Prisma } from '@prisma/client';

import { fimDoPeriodo, inicioDoPeriodo } from './periodo';

/**
 * Monta o `where` apenas com os filtros presentes. Filtro ausente nao entra na cláusula, para o
 * planejador do Postgres poder escolher o índice pelo que de fato foi pedido.
 */
export function filtroDaListagem(query: ListTransactionsQuery): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (query.status !== undefined) {
    where.status = STATUS_BY_NAME[query.status];
  }

  if (query.transferTypeId !== undefined) {
    where.typeId = query.transferTypeId;
  }

  if (query.from !== undefined || query.to !== undefined) {
    where.createdAt = {
      ...(query.from === undefined ? {} : { gte: inicioDoPeriodo(query.from) }),
      ...(query.to === undefined ? {} : { lte: fimDoPeriodo(query.to) }),
    };
  }

  return where;
}

export function totalDePaginas(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}
