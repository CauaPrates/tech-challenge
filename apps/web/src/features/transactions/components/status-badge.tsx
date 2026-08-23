import type { TransactionStatusName } from '@challenge/contracts';

const ESTILO: Record<TransactionStatusName, { caixa: string; ponto: string }> = {
  pendente: { caixa: 'bg-amber-50 text-amber-800 ring-amber-200', ponto: 'bg-amber-500' },
  aprovada: { caixa: 'bg-emerald-50 text-emerald-800 ring-emerald-200', ponto: 'bg-emerald-500' },
  rejeitada: { caixa: 'bg-red-50 text-red-800 ring-red-200', ponto: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: TransactionStatusName }) {
  const estilo = ESTILO[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${estilo.caixa}`}
    >
      <span className={`size-1.5 rounded-full ${estilo.ponto}`} aria-hidden />
      {status}
    </span>
  );
}
