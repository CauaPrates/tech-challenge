import { z } from 'zod';

import { transactionStatusNameSchema } from '../transaction-status';

/** Formato exato do contrato de leitura do enunciado. */
export const transactionResponseSchema = z.object({
  transactionExternalId: z.uuid(),
  transactionType: z.object({ name: z.string().min(1) }),
  transactionStatus: z.object({ name: transactionStatusNameSchema }),
  value: z.number(),
  createdAt: z.iso.datetime(),
});

export type TransactionResponse = z.infer<typeof transactionResponseSchema>;

/**
 * O detalhe acrescenta campos sem remover nenhum do contrato original. updatedAt e o que
 * evidencia que o status mudou depois da criacao, fora do ciclo de request.
 */
export const transactionDetailSchema = transactionResponseSchema.extend({
  accountExternalIdDebit: z.uuid(),
  accountExternalIdCredit: z.uuid(),
  updatedAt: z.iso.datetime(),
});

export type TransactionDetail = z.infer<typeof transactionDetailSchema>;
