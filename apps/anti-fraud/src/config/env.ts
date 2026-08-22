import { z } from 'zod';

/**
 * Nao ha DATABASE_URL: este servico nao guarda estado. A avaliacao e uma funcao pura sobre o
 * evento que chega, e o eventId de saida e derivado da transacao avaliada — entao reprocessar
 * produz o mesmo evento, e a idempotencia do consumidor do outro lado descarta a duplicata.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ANTI_FRAUD_PORT: z.coerce.number().int().positive().default(3002),
  KAFKA_BROKERS: z
    .string()
    .min(1)
    .transform((brokers) => brokers.split(',').map((broker) => broker.trim()))
    .pipe(z.array(z.string().min(1)).min(1)),
  KAFKA_CLIENT_ID: z.string().min(1).default('tech-challenge'),
  KAFKA_GROUP_ID_ANTI_FRAUD: z.string().min(1).default('anti-fraud-consumer'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(`Configuracao de ambiente invalida:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
