import { transactionStatusNameSchema } from '@challenge/contracts';

export interface FiltrosDaListagem {
  page: string;
  status: string;
  transferTypeId: string;
  from: string;
  to: string;
}

export const FILTROS_VAZIOS: FiltrosDaListagem = {
  page: '',
  status: '',
  transferTypeId: '',
  from: '',
  to: '',
};

/**
 * A URL e a fonte da verdade dos filtros. Link compartilhado, botao de voltar e recarregar a
 * pagina funcionam de graca, sem estado duplicado em memoria.
 */
export function filtrosDaUrl(parametros: URLSearchParams): FiltrosDaListagem {
  return {
    page: parametros.get('page') ?? '',
    status: parametros.get('status') ?? '',
    transferTypeId: parametros.get('transferTypeId') ?? '',
    from: parametros.get('from') ?? '',
    to: parametros.get('to') ?? '',
  };
}

/** Filtro em branco nao entra na query string, para a API receber só o que foi pedido. */
export function paraQueryString(filtros: FiltrosDaListagem): URLSearchParams {
  const parametros = new URLSearchParams();

  for (const chave of Object.keys(filtros) as (keyof FiltrosDaListagem)[]) {
    const valor = filtros[chave];

    if (valor !== '') {
      parametros.set(chave, valor);
    }
  }

  return parametros;
}

export function temFiltroAplicado(filtros: FiltrosDaListagem): boolean {
  return (
    filtros.status !== '' ||
    filtros.transferTypeId !== '' ||
    filtros.from !== '' ||
    filtros.to !== ''
  );
}

export function statusValido(valor: string): boolean {
  return transactionStatusNameSchema.safeParse(valor).success;
}
