import {
  type CreateTransactionInput,
  createTransactionSchema,
  type ListTransactionsQuery,
  listTransactionsQuerySchema,
  type PaginatedTransactions,
  type TransactionDetail,
  type TransactionResponse,
  type TransactionsSummary,
  type TransferType,
} from '@challenge/contracts';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  /**
   * Responde sem esperar a avaliacao antifraude: a transacao nasce pendente e muda de status
   * depois, por evento. Devolver o recurso criado poupa uma requisicao ao dashboard.
   */
  @Post()
  async criar(
    @Body(new ZodValidationPipe(createTransactionSchema)) entrada: CreateTransactionInput,
  ): Promise<TransactionResponse> {
    return this.transactions.criar(entrada);
  }

  /** Alimenta o dashboard: pagina ordenada da mais recente para a mais antiga, com o total. */
  @Get()
  async listar(
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
  ): Promise<PaginatedTransactions> {
    return this.transactions.listar(query);
  }

  /**
   * Rotas literais vêm ANTES da rota com parâmetro. O Nest casa na ordem de declaração, e
   * `summary` cairia no ParseUUIDPipe do `:transactionExternalId`, devolvendo 400.
   */
  @Get('types')
  async listarTipos(): Promise<TransferType[]> {
    return this.transactions.listarTipos();
  }

  @Get('summary')
  async resumo(): Promise<TransactionsSummary> {
    return this.transactions.resumo();
  }

  @Get(':transactionExternalId')
  async buscar(
    @Param('transactionExternalId', new ParseUUIDPipe({ version: '4' }))
    transactionExternalId: string,
  ): Promise<TransactionDetail> {
    return this.transactions.buscarPorExternalId(transactionExternalId);
  }
}
