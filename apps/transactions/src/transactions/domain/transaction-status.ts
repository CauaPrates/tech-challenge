import type { FinalTransactionStatus, TransactionStatus } from '@challenge/contracts';

/**
 * PENDENTE e o unico estado de onde se sai. APROVADA e REJEITADA sao finais, e e isso que
 * torna o consumo do resultado seguro contra evento duplicado ou fora de ordem: reaplicar so
 * tem efeito uma vez.
 */
const TRANSICOES_VALIDAS: Record<TransactionStatus, readonly TransactionStatus[]> = {
  PENDENTE: ['APROVADA', 'REJEITADA'],
  APROVADA: [],
  REJEITADA: [],
};

export function podeTransicionar(
  atual: TransactionStatus,
  proximo: FinalTransactionStatus,
): boolean {
  return TRANSICOES_VALIDAS[atual].includes(proximo);
}

export function ehEstadoFinal(status: TransactionStatus): boolean {
  return TRANSICOES_VALIDAS[status].length === 0;
}
