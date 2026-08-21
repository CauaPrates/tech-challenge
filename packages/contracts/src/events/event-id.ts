import { createHash } from 'node:crypto';

/**
 * Namespace fixo deste dominio. Trocar este valor muda todo eventId derivado, o que faria
 * eventos ja processados parecerem novos para a guarda de idempotencia.
 */
export const EVENT_ID_NAMESPACE = '1559c9db-3c87-4d1a-a5bd-43c467d77d30';

function namespaceToBytes(namespace: string): Buffer {
  return Buffer.from(namespace.replace(/-/g, ''), 'hex');
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** UUID versao 5 conforme RFC 4122: SHA-1 dos bytes do namespace concatenados ao nome. */
export function uuidV5(name: string, namespace: string): string {
  const digest = createHash('sha1')
    .update(namespaceToBytes(namespace))
    .update(Buffer.from(name, 'utf8'))
    .digest();

  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  return formatUuid(bytes);
}

/**
 * O eventId do resultado da avaliacao e derivado da transacao avaliada, nao sorteado. E isso
 * que permite o anti-fraud reprocessar um transaction.created sem banco: o evento gerado na
 * segunda vez e identico ao da primeira, e a idempotencia do consumidor descarta.
 */
export function statusUpdatedEventId(transactionExternalId: string): string {
  return uuidV5(`transaction.status.updated:${transactionExternalId}`, EVENT_ID_NAMESPACE);
}
