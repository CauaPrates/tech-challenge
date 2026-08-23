'use client';

import type { CreateTransactionInput } from '@challenge/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { criarTransacao } from '../api/client';

export function useCriarTransacao() {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (entrada: CreateTransactionInput) => criarTransacao(entrada),
    onSuccess: () => {
      // a listagem passa a estar desatualizada no instante da criacao
      void cliente.invalidateQueries({ queryKey: ['transacoes'] });
    },
  });
}
