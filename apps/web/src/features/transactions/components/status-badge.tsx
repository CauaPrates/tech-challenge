import type { TransactionStatusName } from '@challenge/contracts';

const ESTILO: Record<TransactionStatusName, string> = {
  pendente: 'bg-amber-100 text-amber-800',
  aprovada: 'bg-emerald-100 text-emerald-800',
  rejeitada: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: TransactionStatusName }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO[status]}`}
    >
      {status}
    </span>
  );
}
