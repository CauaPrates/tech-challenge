import { z } from 'zod';

import { decimalStringSchema } from '../money';
import { envelopeSchema } from './envelope';
import { TOPICS } from './topics';

/**
 * As contas nao entram no payload: o anti-fraud decide por valor e nao as consome. Evento nao e
 * lugar para carregar dado que ninguem le.
 */
export const transactionCreatedPayloadSchema = z.object({
  transactionExternalId: z.uuid(),
  transferTypeId: z.int().positive(),
  value: decimalStringSchema,
});

export const transactionCreatedSchema = envelopeSchema(
  TOPICS.transactionCreated,
  transactionCreatedPayloadSchema,
);

export type TransactionCreatedPayload = z.infer<typeof transactionCreatedPayloadSchema>;
export type TransactionCreatedEvent = z.infer<typeof transactionCreatedSchema>;
