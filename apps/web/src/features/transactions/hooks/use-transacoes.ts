'use client';

import type { PaginatedTransactions } from '@challenge/contracts';
import { useQuery } from '@tanstack/react-query';

import { listarTransacoes } from '../api/client';

const INTERVALO_PADRAO = 3000;

function intervaloDoPolling(): number {
  const bruto = process.env.NEXT_PUBLIC_POLL_INTERVAL_MS;
  const numero = bruto === undefined ? Number.NaN : Number(bruto);

  return Number.isFinite(numero) && numero > 0 ? numero : INTERVALO_PADRAO;
}

export function temPendente(pagina: PaginatedTransactions | undefined): boolean {
  return pagina?.data.some((t) => t.transactionStatus.name === 'pendente') ?? false;
}

/**
 * O polling e adaptativo: liga somente enquanto existe transacao pendente na pagina atual e
 * desliga quando nao existe. Sem isso, a tela buscaria dados para sempre sem nada mudar — e o
 * status so muda por evento, entao esperar por ele e o unico trabalho util.
 */
export function useTransacoes(parametros: URLSearchParams) {
  return useQuery({
    queryKey: ['transacoes', parametros.toString()],
    queryFn: () => listarTransacoes(parametros),
    refetchInterval: (query) => (temPendente(query.state.data) ? intervaloDoPolling() : false),
    placeholderData: (anterior) => anterior,
  });
}
