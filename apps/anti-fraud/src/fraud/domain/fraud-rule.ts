import type { FinalTransactionStatus } from '@challenge/contracts';

/**
 * O enunciado diz "acima de 1000". Entao 1000 passa e 1000.01 nao — o limite e inclusivo, e e
 * exatamente aqui que um bug de um centavo mora.
 */
export const LIMITE_APROVACAO = 1000n * 100n;

export interface Veredito {
  status: FinalTransactionStatus;
  reason: string;
}

/**
 * Compara em centavos inteiros, nunca em ponto flutuante. O valor chega como string decimal e e
 * convertido para BigInt de centavos; comparar 1000.01 com Number introduz erro de
 * representacao justamente na fronteira que decide aprovacao.
 */
export function centavosDe(valorDecimal: string): bigint {
  const [inteiros = '0', decimais = ''] = valorDecimal.split('.');
  const centavos = decimais.padEnd(2, '0').slice(0, 2);

  return BigInt(inteiros) * 100n + BigInt(centavos);
}

export function avaliar(valorDecimal: string): Veredito {
  const centavos = centavosDe(valorDecimal);

  if (centavos > LIMITE_APROVACAO) {
    return { status: 'REJEITADA', reason: 'valor acima do limite permitido de 1000' };
  }

  return { status: 'APROVADA', reason: 'valor dentro do limite permitido' };
}
