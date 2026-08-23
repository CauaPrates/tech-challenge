'use client';

import type { TransactionDetail } from '@challenge/contracts';
import { useQuery } from '@tanstack/react-query';

import { buscarTransacao, ErroDaApi } from '../api/client';

const INTERVALO_PADRAO = 3000;

function intervalo(): number {
  const numero = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS);

  return Number.isFinite(numero) && numero > 0 ? numero : INTERVALO_PADRAO;
}

/** Mesma regra da listagem: só busca de novo enquanto a transação está pendente. */
export function useTransacao(externalId: string) {
  return useQuery<TransactionDetail, Error>({
    queryKey: ['transacao', externalId],
    queryFn: () => buscarTransacao(externalId),
    // 404 nao melhora com retentativa: e resposta, nao falha
    retry: (tentativas, erro) =>
      erro instanceof ErroDaApi && erro.status === 404 ? false : tentativas < 1,
    refetchInterval: (query) =>
      query.state.data?.transactionStatus.name === 'pendente' ? intervalo() : false,
  });
}
