export const TOPICS = {
  transactionCreated: 'transaction.created',
  transactionStatusUpdated: 'transaction.status.updated',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

/** Toda DLQ e o topico de origem com sufixo, para a origem de uma mensagem morta ser obvia. */
export function deadLetterTopic(topic: Topic): string {
  return `${topic}.dlq`;
}
