import type { PaginatedTransactions } from '@challenge/contracts';
import Link from 'next/link';

import { formatarDataHora, formatarValor } from '../formato';
import { Identificador } from './identificador';
import { StatusBadge } from './status-badge';

interface TabelaTransacoesProps {
  pagina: PaginatedTransactions;
  onMudarPagina: (page: number) => void;
}

const CABECALHOS = ['Identificador', 'Tipo', 'Status', 'Valor', 'Criada em', ''] as const;

export function TabelaTransacoes({ pagina, onMudarPagina }: TabelaTransacoesProps) {
  const primeira = pagina.page <= 1;
  const ultima = pagina.page >= pagina.totalPages;
  const primeiroDaPagina = (pagina.page - 1) * pagina.pageSize + 1;
  const ultimoDaPagina = Math.min(pagina.page * pagina.pageSize, pagina.total);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Transações registradas</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {CABECALHOS.map((cabecalho, indice) => (
                <th
                  key={cabecalho === '' ? 'acoes' : cabecalho}
                  scope="col"
                  className={`px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase ${
                    indice === 3 ? 'text-right' : 'text-left'
                  }`}
                >
                  {cabecalho}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagina.data.map((transacao) => (
              <tr key={transacao.transactionExternalId} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <Identificador valor={transacao.transactionExternalId} />
                </td>
                <td className="px-4 py-2.5 text-slate-700">{transacao.transactionType.name}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={transacao.transactionStatus.name} />
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-900">
                  {formatarValor(transacao.value)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                  {formatarDataHora(transacao.createdAt)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/transacoes/${transacao.transactionExternalId}`}
                    className="rounded text-xs font-medium text-indigo-600 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Detalhe
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Paginação"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm"
      >
        <p className="text-slate-600">
          <span className="font-medium tabular-nums text-slate-900">
            {primeiroDaPagina}–{ultimoDaPagina}
          </span>{' '}
          de <span className="font-medium tabular-nums text-slate-900">{pagina.total}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 tabular-nums">
            Página {pagina.page} de {Math.max(pagina.totalPages, 1)}
          </span>
          <button
            type="button"
            disabled={primeira}
            onClick={() => onMudarPagina(pagina.page - 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={ultima}
            onClick={() => onMudarPagina(pagina.page + 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </nav>
    </div>
  );
}
