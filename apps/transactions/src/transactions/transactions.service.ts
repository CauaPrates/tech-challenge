import { randomUUID } from 'node:crypto';

import {
  type CreateTransactionInput,
  type ListTransactionsQuery,
  type PaginatedTransactions,
  TOPICS,
  type TransactionDetail,
  type TransactionResponse,
} from '@challenge/contracts';
import { Injectable } from '@nestjs/common';

import { decimalParaString, numeroParaDecimal } from '../common/decimal';
import { TransactionNotFoundError, TransactionTypeNotFoundError } from '../common/errors';
import { OutboxRepository } from '../outbox/outbox.repository';
import { PrismaService } from '../prisma/prisma.service';
import { filtroDaListagem, totalDePaginas } from './listagem';
import { paraContratoDeDetalhe, paraContratoDeLeitura } from './transaction.mapper';
import { TransactionsRepository } from './transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transacoes: TransactionsRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  /**
   * A transacao e o evento nascem no mesmo COMMIT. Nao existe instante em que a transacao esta
   * gravada e o evento perdido, que e o dual-write que um publish direto no Kafka teria.
   * A publicacao em si e do dispatcher, fora do caminho da requisicao.
   */
  async criar(entrada: CreateTransactionInput): Promise<TransactionResponse> {
    const transacao = await this.prisma.$transaction(async (tx) => {
      if (!(await this.transacoes.tipoExiste(tx, entrada.transferTypeId))) {
        throw new TransactionTypeNotFoundError(entrada.transferTypeId);
      }

      const criada = await this.transacoes.criar(tx, {
        accountExternalIdDebit: entrada.accountExternalIdDebit,
        accountExternalIdCredit: entrada.accountExternalIdCredit,
        typeId: entrada.transferTypeId,
        value: numeroParaDecimal(entrada.value),
      });

      await this.outbox.enfileirar(tx, {
        eventId: randomUUID(),
        eventName: TOPICS.transactionCreated,
        aggregateId: criada.externalId,
        payload: {
          transactionExternalId: criada.externalId,
          transferTypeId: criada.typeId,
          value: decimalParaString(criada.value),
        },
        occurredAt: criada.createdAt,
      });

      return criada;
    });

    return paraContratoDeLeitura(transacao);
  }

  async listar(query: ListTransactionsQuery): Promise<PaginatedTransactions> {
    const { itens, total } = await this.transacoes.listar(
      filtroDaListagem(query),
      query.page,
      query.pageSize,
    );

    return {
      data: itens.map(paraContratoDeLeitura),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: totalDePaginas(total, query.pageSize),
    };
  }

  async buscarPorExternalId(externalId: string): Promise<TransactionDetail> {
    const transacao = await this.transacoes.buscarPorExternalId(externalId);

    if (transacao === null) {
      throw new TransactionNotFoundError(externalId);
    }

    return paraContratoDeDetalhe(transacao);
  }
}
