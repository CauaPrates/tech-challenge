export interface ParametrosDeRecuo {
  baseMs: number;
  tetoMs: number;
}

/**
 * Recuo exponencial: 1s, 2s, 4s, 8s... limitado por um teto. E o que separa "o broker piscou"
 * de "essa mensagem nunca vai passar" — sem recuo, um broker fora do ar por meio minuto esgota
 * as tentativas de uma mensagem perfeitamente valida.
 */
export function atrasoDaProximaTentativa(
  tentativasJaFeitas: number,
  { baseMs, tetoMs }: ParametrosDeRecuo,
): number {
  const expoente = Math.min(tentativasJaFeitas, 30);

  return Math.min(baseMs * 2 ** expoente, tetoMs);
}

export function proximaTentativaEm(
  agora: Date,
  tentativasJaFeitas: number,
  parametros: ParametrosDeRecuo,
): Date {
  return new Date(agora.getTime() + atrasoDaProximaTentativa(tentativasJaFeitas, parametros));
}
