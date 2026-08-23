const SOMENTE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * O filtro de periodo e inclusivo nos dois extremos, e o dashboard manda data sem hora. Para
 * `to = 2026-08-21` incluir o dia inteiro, o limite superior precisa ir ate o fim do dia — sem
 * isso, tudo que aconteceu depois da meia-noite ficaria de fora.
 */
export function inicioDoPeriodo(valor: string): Date {
  return SOMENTE_DATA.test(valor) ? new Date(`${valor}T00:00:00.000Z`) : new Date(valor);
}

export function fimDoPeriodo(valor: string): Date {
  return SOMENTE_DATA.test(valor) ? new Date(`${valor}T23:59:59.999Z`) : new Date(valor);
}
