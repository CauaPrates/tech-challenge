const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

export function formatarValor(valor: number): string {
  return MOEDA.format(valor);
}

export function formatarDataHora(iso: string): string {
  return DATA_HORA.format(new Date(iso));
}
