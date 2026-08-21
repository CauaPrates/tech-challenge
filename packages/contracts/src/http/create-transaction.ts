import { z } from 'zod';

import { monetaryNumberSchema } from '../money';

export const createTransactionSchema = z.object({
  accountExternalIdDebit: z.uuid(),
  accountExternalIdCredit: z.uuid(),
  transferTypeId: z.int().positive(),
  value: monetaryNumberSchema,
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
