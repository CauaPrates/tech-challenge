'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { EstadoDeCarregamento, EstadoDeErro, EstadoVazio } from '@/components/ui/estados';

import {
  type FiltrosDaListagem,
  filtrosDaUrl,
  paraQueryString,
  temFiltroAplicado,
} from '../filtros';
import { useTransacoes } from '../hooks/use-transacoes';
import { FiltrosForm } from './filtros-form';
import { TabelaTransacoes } from './tabela-transacoes';

export function PainelTransacoes() {
  const router = useRouter();
  const parametros = useSearchParams();
  const filtros = filtrosDaUrl(parametros);
  const consulta = useTransacoes(paraQueryString(filtros));

  const navegar = useCallback(
    (novos: FiltrosDaListagem) => {
      const query = paraQueryString(novos).toString();

      router.push(query === '' ? '/' : `/?${query}`);
    },
    [router],
  );

  return (
    <div className="space-y-4">
      <FiltrosForm filtros={filtros} onAplicar={navegar} />

      {consulta.isPending && <EstadoDeCarregamento rotulo="Carregando transações" />}

      {consulta.isError && (
        <EstadoDeErro
          mensagem={
            consulta.error instanceof Error
              ? consulta.error.message
              : 'não foi possível carregar as transações'
          }
          onTentarNovamente={() => void consulta.refetch()}
        />
      )}

      {consulta.data !== undefined &&
        (consulta.data.data.length === 0 ? (
          // vazio por filtro e vazio de verdade são situações diferentes, e a tela diz qual é
          <EstadoVazio
            titulo={
              temFiltroAplicado(filtros)
                ? 'Nenhuma transação para este filtro'
                : 'Nenhuma transação registrada'
            }
            descricao={
              temFiltroAplicado(filtros)
                ? 'Ajuste ou limpe os filtros para ver outros resultados.'
                : 'Crie a primeira transação para vê-la aqui.'
            }
          />
        ) : (
          <TabelaTransacoes
            pagina={consulta.data}
            onMudarPagina={(page) => {
              navegar({ ...filtros, page: String(page) });
            }}
          />
        ))}
    </div>
  );
}
