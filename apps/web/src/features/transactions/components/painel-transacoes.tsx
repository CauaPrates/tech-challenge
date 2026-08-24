'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { EstadoDeCarregamento, EstadoDeErro, EstadoVazio } from '@/components/ui/estados';

import {
  type FiltrosDaListagem,
  filtrosDaUrl,
  paraQueryString,
  temFiltroAplicado,
} from '../filtros';
import { temPendente, useTransacoes } from '../hooks/use-transacoes';
import { FiltrosForm } from './filtros-form';
import { IndicadorDeAtualizacao } from './indicador-de-atualizacao';
import { ResumoStatus } from './resumo-status';
import { TabelaTransacoes } from './tabela-transacoes';

export function PainelTransacoes() {
  const router = useRouter();
  const parametros = useSearchParams();
  const filtros = filtrosDaUrl(parametros);
  const consulta = useTransacoes(paraQueryString(filtros));
  const comFiltro = temFiltroAplicado(filtros);

  const navegar = useCallback(
    (novos: FiltrosDaListagem) => {
      const query = paraQueryString(novos).toString();

      router.push(query === '' ? '/' : `/?${query}`);
    },
    [router],
  );

  return (
    <div className="space-y-4">
      <ResumoStatus />
      <FiltrosForm filtros={filtros} onAplicar={navegar} />
      <IndicadorDeAtualizacao ativo={temPendente(consulta.data)} />

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
              comFiltro ? 'Nenhuma transação para este filtro' : 'Nenhuma transação registrada'
            }
            descricao={
              comFiltro
                ? 'Nenhum registro atende à combinação escolhida. Ajuste ou limpe os filtros.'
                : 'Crie a primeira transação para acompanhá-la mudando de status aqui.'
            }
            acao={
              comFiltro ? (
                <button
                  type="button"
                  onClick={() => {
                    navegar({ page: '', status: '', transferTypeId: '', from: '', to: '' });
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
                >
                  Limpar filtros
                </button>
              ) : (
                <Link
                  href="/transacoes/nova"
                  className="inline-block rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  Criar transação
                </Link>
              )
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
