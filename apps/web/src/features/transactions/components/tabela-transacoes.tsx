import type { PaginatedTransactions } from '@challenge/contracts';
import Link from 'next/link';

import { formatarDataHora, formatarValor } from '../formato';
import { StatusBadge } from './status-badge';

interface TabelaTransacoesProps {
  pagina: PaginatedTransactions;
  onMudarPagina: (page: number) => void;
}

export function TabelaTransacoes({ pagina, onMudarPagina }: TabelaTransacoesProps) {
  const primeira = pagina.page <= 1;
  const ultima = pagina.page >= pagina.totalPages;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Transações</caption>
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Identificador
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Tipo
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Valor
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Criada em
              </th>
            </tr>
          </thead>
          <tbody>
            {pagina.data.map((transacao) => (
              <tr key={transacao.transactionExternalId} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/transacoes/${transacao.transactionExternalId}`}
                    className="font-mono text-xs text-blue-700 underline"
                  >
                    {transacao.transactionExternalId.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2">{transacao.transactionType.name}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={transacao.transactionStatus.name} />
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatarValor(transacao.value)}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatarDataHora(transacao.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav aria-label="Paginação" className="flex items-center justify-between text-sm">
        <p className="text-slate-600">
          Página {pagina.page} de {Math.max(pagina.totalPages, 1)} — {pagina.total} no total
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={primeira}
            onClick={() => onMudarPagina(pagina.page - 1)}
            className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={ultima}
            onClick={() => onMudarPagina(pagina.page + 1)}
            className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </nav>
    </div>
  );
}
