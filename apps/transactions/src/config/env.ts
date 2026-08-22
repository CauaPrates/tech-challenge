import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TRANSACTIONS_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  // aceita lista separada por virgula, que e o formato que o kafkajs espera como array
  KAFKA_BROKERS: z
    .string()
    .min(1)
    .transform((brokers) => brokers.split(',').map((broker) => broker.trim()))
    .pipe(z.array(z.string().min(1)).min(1)),
  KAFKA_CLIENT_ID: z.string().min(1).default('tech-challenge'),
  KAFKA_GROUP_ID_TRANSACTIONS: z.string().min(1).default('transactions-consumer'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().max(500).default(50),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  OUTBOX_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_BACKOFF_MAX_MS: z.coerce.number().int().positive().default(60000),
  // lease: quanto tempo uma mensagem reivindicada fica invisivel para outras instancias
  OUTBOX_LEASE_MS: z.coerce.number().int().positive().default(30000),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Roda na subida, nao no primeiro uso: variavel faltando derruba o processo imediatamente, em
 * vez de virar undefined que estoura mais tarde num caminho qualquer.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(`Configuracao de ambiente invalida:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
