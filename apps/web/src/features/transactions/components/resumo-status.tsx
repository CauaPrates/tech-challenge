'use client';

import { useResumo } from '../hooks/use-resumo';

const CARTOES = [
  { chave: 'pendente', rotulo: 'Pendentes', ponto: 'bg-amber-500' },
  { chave: 'aprovada', rotulo: 'Aprovadas', ponto: 'bg-emerald-500' },
  { chave: 'rejeitada', rotulo: 'Rejeitadas', ponto: 'bg-red-500' },
] as const;

export function ResumoStatus() {
  const resumo = useResumo();

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Total</dt>
        <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
          {resumo.data?.total ?? '—'}
        </dd>
      </div>

      {CARTOES.map((cartao) => (
        <div
          key={cartao.chave}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs"
        >
          <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
            <span className={`size-1.5 rounded-full ${cartao.ponto}`} aria-hidden />
            {cartao.rotulo}
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {resumo.data?.porStatus[cartao.chave] ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
