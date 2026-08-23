'use client';

import { useQuery } from '@tanstack/react-query';

import { listarTipos } from '../api/client';

/**
 * Os tipos vinham chumbados no componente de filtros, duplicando a tabela do banco. Agora vêm da
 * API: acrescentar um tipo por migration passa a aparecer na tela sem tocar no front.
 */
export function useTipos() {
  return useQuery({
    queryKey: ['tipos-de-transferencia'],
    queryFn: listarTipos,
    // dado de referência: não muda durante a sessão
    staleTime: Infinity,
  });
}
