'use client';

import { FILTROS_VAZIOS, type FiltrosDaListagem, temFiltroAplicado } from '../filtros';
import { useTipos } from '../hooks/use-tipos';

interface FiltrosFormProps {
  filtros: FiltrosDaListagem;
  onAplicar: (filtros: FiltrosDaListagem) => void;
}

const CLASSE_CAMPO =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-xs outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-100';

/** FormData.get devolve string | File | null; a guarda evita cair no toString de File. */
function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);

  return typeof valor === 'string' ? valor : '';
}

export function FiltrosForm({ filtros, onAplicar }: FiltrosFormProps) {
  const tipos = useTipos();

  function aplicar(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);

    onAplicar({
      // trocar de filtro volta para a primeira pagina: manter a pagina 7 num resultado de duas
      // paginas mostraria vazio sem explicacao
      page: '',
      status: texto(dados, 'status'),
      transferTypeId: texto(dados, 'transferTypeId'),
      from: texto(dados, 'from'),
      to: texto(dados, 'to'),
    });
  }

  return (
    <form
      onSubmit={aplicar}
      aria-label="Filtros"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select name="status" defaultValue={filtros.status} className={CLASSE_CAMPO}>
            <option value="">Todos</option>
            <option value="pendente">pendente</option>
            <option value="aprovada">aprovada</option>
            <option value="rejeitada">rejeitada</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Tipo
          {/*
            key muda quando as opcoes chegam da API. Sem isto o select ja montou vazio e o
            defaultValue vindo da URL nao e reaplicado — o filtro de tipo apareceria em branco
            mesmo com transferTypeId na query string.
          */}
          <select
            key={tipos.isSuccess ? 'carregado' : 'carregando'}
            name="transferTypeId"
            defaultValue={filtros.transferTypeId}
            disabled={tipos.isPending}
            className={CLASSE_CAMPO}
          >
            <option value="">Todos</option>
            {(tipos.data ?? []).map((tipo) => (
              <option key={tipo.id} value={String(tipo.id)}>
                {tipo.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          De
          <input type="date" name="from" defaultValue={filtros.from} className={CLASSE_CAMPO} />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Até
          <input type="date" name="to" defaultValue={filtros.to} className={CLASSE_CAMPO} />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Filtrar
          </button>
          <button
            type="button"
            disabled={!temFiltroAplicado(filtros)}
            onClick={() => onAplicar(FILTROS_VAZIOS)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpar
          </button>
        </div>
      </div>
    </form>
  );
}
