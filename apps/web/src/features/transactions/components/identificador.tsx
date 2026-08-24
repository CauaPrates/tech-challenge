'use client';

import { useState } from 'react';

/** A tabela mostra só o começo do uuid; sem copiar, ninguém consegue usá-lo em outro lugar. */
export function Identificador({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar(): Promise<void> {
    await globalThis.navigator.clipboard.writeText(valor);
    setCopiado(true);
    globalThis.setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      title={`Copiar ${valor}`}
      aria-label={`Copiar identificador ${valor}`}
      className="rounded font-mono text-xs text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {copiado ? 'copiado' : `${valor.slice(0, 8)}…`}
    </button>
  );
}
