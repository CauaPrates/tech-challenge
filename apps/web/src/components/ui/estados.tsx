interface EstadoDeErroProps {
  mensagem: string;
  onTentarNovamente?: () => void;
}

interface EstadoVazioProps {
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
}

export function EstadoDeCarregamento({ rotulo }: { rotulo: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
    >
      <span className="sr-only">{rotulo}</span>
      {[0, 1, 2, 3].map((linha) => (
        <div
          key={linha}
          className="h-9 animate-pulse rounded bg-slate-100"
          style={{ opacity: 1 - linha * 0.2 }}
        />
      ))}
    </div>
  );
}

export function EstadoDeErro({ mensagem, onTentarNovamente }: EstadoDeErroProps) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-6 shadow-xs"
    >
      <div>
        <p className="text-sm font-semibold text-red-900">Não foi possível carregar</p>
        <p className="mt-0.5 text-sm text-red-800">{mensagem}</p>
      </div>
      {onTentarNovamente !== undefined && (
        <button
          type="button"
          onClick={onTentarNovamente}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EstadoVazio({ titulo, descricao, acao }: EstadoVazioProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-slate-800">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{descricao}</p>
      {acao !== undefined && <div className="mt-5">{acao}</div>}
    </div>
  );
}
