interface EstadoDeErroProps {
  mensagem: string;
  onTentarNovamente?: () => void;
}

export function EstadoDeCarregamento({ rotulo }: { rotulo: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2 p-6">
      <span className="sr-only">{rotulo}</span>
      {[0, 1, 2].map((linha) => (
        <div key={linha} className="h-10 animate-pulse rounded bg-slate-200" />
      ))}
    </div>
  );
}

export function EstadoDeErro({ mensagem, onTentarNovamente }: EstadoDeErroProps) {
  return (
    <div role="alert" className="space-y-3 rounded border border-red-200 bg-red-50 p-6">
      <p className="text-sm text-red-800">{mensagem}</p>
      {onTentarNovamente !== undefined && (
        <button
          type="button"
          onClick={onTentarNovamente}
          className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-8 text-center">
      <p className="font-medium text-slate-700">{titulo}</p>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>
    </div>
  );
}
