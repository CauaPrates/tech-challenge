import { Prisma } from '@prisma/client';

/**
 * O Decimal do Prisma nao serializa em JSON. A conversao para number acontece so na borda HTTP,
 * porque o contrato do enunciado pede number — dentro do sistema o valor continua decimal.
 */
export function decimalParaNumero(valor: Prisma.Decimal): number {
  return valor.toNumber();
}

/** Para o evento, o valor vira string decimal com duas casas: nunca passa por float. */
export function decimalParaString(valor: Prisma.Decimal): string {
  return valor.toFixed(2);
}

export function numeroParaDecimal(valor: number): Prisma.Decimal {
  return new Prisma.Decimal(valor.toFixed(2));
}
