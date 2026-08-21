import { z } from 'zod';

export const EVENT_VERSION = 1;

/**
 * Casca comum dos eventos. O eventId sustenta a idempotencia, o eventVersion abre espaco para
 * evoluir o payload sem quebrar consumidor antigo, e o occurredAt e quando o fato aconteceu —
 * nao quando a mensagem foi publicada, o que permite medir a latencia real do fluxo.
 */
export function envelopeSchema<TName extends string, TPayload extends z.ZodType>(
  eventName: TName,
  payload: TPayload,
) {
  return z.object({
    eventId: z.uuid(),
    eventName: z.literal(eventName),
    eventVersion: z.literal(EVENT_VERSION),
    occurredAt: z.iso.datetime(),
    payload,
  });
}
