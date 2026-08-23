import {
  type CreateTransactionInput,
  type PaginatedTransactions,
  paginatedTransactionsSchema,
  type TransactionDetail,
  transactionDetailSchema,
  type TransactionResponse,
  transactionResponseSchema,
} from '@challenge/contracts';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ErroDeCampo {
  path: string;
  message: string;
}

/** Erro que a tela sabe exibir: mensagem legivel e, quando houver, o campo culpado. */
export class ErroDaApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly campos: ErroDeCampo[] = [],
  ) {
    super(message);
    this.name = 'ErroDaApi';
  }
}

interface CorpoDeErro {
  message?: unknown;
  details?: unknown;
}

function camposDoErro(corpo: CorpoDeErro): ErroDeCampo[] {
  if (!Array.isArray(corpo.details)) {
    return [];
  }

  return corpo.details.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }

    const { path, message } = item as Record<string, unknown>;

    return typeof path === 'string' && typeof message === 'string' ? [{ path, message }] : [];
  });
}

async function requisitar<T>(
  caminho: string,
  schema: { parse: (v: unknown) => T },
  init?: RequestInit,
): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const corpo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = (corpo ?? {}) as CorpoDeErro;
    const mensagem = typeof erro.message === 'string' ? erro.message : 'falha ao falar com a API';

    throw new ErroDaApi(mensagem, resposta.status, camposDoErro(erro));
  }

  // valida a resposta em runtime: divergencia entre API e front aparece como erro claro, e nao
  // como undefined estourando em algum canto da tela
  return schema.parse(corpo);
}

export function listarTransacoes(parametros: URLSearchParams): Promise<PaginatedTransactions> {
  return requisitar(`/transactions?${parametros.toString()}`, paginatedTransactionsSchema);
}

export function buscarTransacao(externalId: string): Promise<TransactionDetail> {
  return requisitar(`/transactions/${externalId}`, transactionDetailSchema);
}

export function criarTransacao(entrada: CreateTransactionInput): Promise<TransactionResponse> {
  return requisitar('/transactions', transactionResponseSchema, {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
}
