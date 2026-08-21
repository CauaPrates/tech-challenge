import { z } from 'zod';

import { transactionStatusNameSchema } from '../transaction-status';
import { transactionResponseSchema } from './transaction-response';

const isoDateOrDateTimeSchema = z.union([z.iso.datetime(), z.iso.date()]);

/**
 * pageSize tem teto para um cliente nao conseguir pedir a tabela inteira numa requisicao.
 * Os campos usam coerce porque query string chega sempre como texto.
 */
export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: transactionStatusNameSchema.optional(),
    transferTypeId: z.coerce.number().int().positive().optional(),
    from: isoDateOrDateTimeSchema.optional(),
    to: isoDateOrDateTimeSchema.optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from deve ser anterior ou igual a to',
    path: ['from'],
  });

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export const paginatedTransactionsSchema = z.object({
  data: z.array(transactionResponseSchema),
  page: z.int().positive(),
  pageSize: z.int().positive(),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
});

export type PaginatedTransactions = z.infer<typeof paginatedTransactionsSchema>;
