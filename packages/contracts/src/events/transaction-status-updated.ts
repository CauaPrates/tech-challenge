import { z } from 'zod';

import { finalTransactionStatusSchema } from '../transaction-status';
import { envelopeSchema } from './envelope';
import { TOPICS } from './topics';

/** reason existe para o veredito do anti-fraud ser auditavel de quem recebe, e nao so aceito. */
export const transactionStatusUpdatedPayloadSchema = z.object({
  transactionExternalId: z.uuid(),
  status: finalTransactionStatusSchema,
  reason: z.string().min(1),
});

export const transactionStatusUpdatedSchema = envelopeSchema(
  TOPICS.transactionStatusUpdated,
  transactionStatusUpdatedPayloadSchema,
);

export type TransactionStatusUpdatedPayload = z.infer<typeof transactionStatusUpdatedPayloadSchema>;
export type TransactionStatusUpdatedEvent = z.infer<typeof transactionStatusUpdatedSchema>;
