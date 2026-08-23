'use client';

import { FILTROS_VAZIOS, type FiltrosDaListagem } from '../filtros';

interface FiltrosFormProps {
  filtros: FiltrosDaListagem;
  onAplicar: (filtros: FiltrosDaListagem) => void;
}

const TIPOS = [
  { id: '1', nome: 'transferencia' },
  { id: '2', nome: 'pagamento' },
  { id: '3', nome: 'deposito' },
];

/** FormData.get devolve string | File | null; a guarda evita cair no toString de File. */
function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);

  return typeof valor === 'string' ? valor : '';
}

export function FiltrosForm({ filtros, onAplicar }: FiltrosFormProps) {
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
      className="grid gap-4 rounded border border-slate-200 bg-white p-4 sm:grid-cols-5"
    >
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          name="status"
          defaultValue={filtros.status}
          className="rounded border border-slate-300 px-2 py-1.5"
        >
          <option value="">Todos</option>
          <option value="pendente">pendente</option>
          <option value="aprovada">aprovada</option>
          <option value="rejeitada">rejeitada</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select
          name="transferTypeId"
          defaultValue={filtros.transferTypeId}
          className="rounded border border-slate-300 px-2 py-1.5"
        >
          <option value="">Todos</option>
          {TIPOS.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        De
        <input
          type="date"
          name="from"
          defaultValue={filtros.from}
          className="rounded border border-slate-300 px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Até
        <input
          type="date"
          name="to"
          defaultValue={filtros.to}
          className="rounded border border-slate-300 px-2 py-1.5"
        />
      </label>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={() => onAplicar(FILTROS_VAZIOS)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
