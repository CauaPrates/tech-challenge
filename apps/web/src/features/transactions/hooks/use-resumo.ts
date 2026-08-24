'use client';

import { useQuery } from '@tanstack/react-query';

import { buscarResumo } from '../api/client';

export function useResumo() {
  return useQuery({
    queryKey: ['resumo-de-transacoes'],
    queryFn: buscarResumo,
  });
}
