'use client';

import Link from 'next/link';

import { EstadoDeCarregamento, EstadoDeErro, EstadoVazio } from '@/components/ui/estados';

import { ErroDaApi } from '../api/client';
import { formatarDataHora, formatarValor } from '../formato';
import { useTransacao } from '../hooks/use-transacao';
import { IndicadorDeAtualizacao } from './indicador-de-atualizacao';
import { StatusBadge } from './status-badge';

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-slate-100 px-5 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{rotulo}</dt>
      <dd className="text-sm text-slate-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

export function DetalheTransacao({ externalId }: { externalId: string }) {
  const consulta = useTransacao(externalId);

  if (consulta.isPending) {
    return <EstadoDeCarregamento rotulo="Carregando transação" />;
  }

  // nao encontrado nao e erro de sistema, e resposta: a tela precisa dizer isso sem alarmar
  if (consulta.error instanceof ErroDaApi && consulta.error.status === 404) {
    return (
      <EstadoVazio
        titulo="Transação não encontrada"
        descricao="O identificador informado não corresponde a nenhuma transação registrada."
        acao={
          <Link
            href="/"
            className="inline-block rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Voltar para a listagem
          </Link>
        }
      />
    );
  }

  if (consulta.isError) {
    return (
      <EstadoDeErro
        mensagem={consulta.error.message}
        onTentarNovamente={() => void consulta.refetch()}
      />
    );
  }

  const transacao = consulta.data;
  const pendente = transacao.transactionStatus.name === 'pendente';

  return (
    <div className="space-y-4">
      <IndicadorDeAtualizacao ativo={pendente} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs tracking-wide text-slate-500 uppercase">Valor</p>
            <p className="text-2xl font-semibold tabular-nums">{formatarValor(transacao.value)}</p>
          </div>
          <StatusBadge status={transacao.transactionStatus.name} />
        </div>

        <dl>
          <Campo rotulo="Identificador">
            <span className="font-mono text-xs break-all">{transacao.transactionExternalId}</span>
          </Campo>
          <Campo rotulo="Tipo">{transacao.transactionType.name}</Campo>
          <Campo rotulo="Conta de débito">
            <span className="font-mono text-xs break-all">{transacao.accountExternalIdDebit}</span>
          </Campo>
          <Campo rotulo="Conta de crédito">
            <span className="font-mono text-xs break-all">{transacao.accountExternalIdCredit}</span>
          </Campo>
          <Campo rotulo="Criada em">{formatarDataHora(transacao.createdAt)}</Campo>
          <Campo rotulo="Última alteração">
            {formatarDataHora(transacao.updatedAt)}
            {!pendente && (
              <span className="ml-2 text-xs text-slate-500">
                (quando o veredito do antifraude foi aplicado)
              </span>
            )}
          </Campo>
        </dl>
      </div>

      <Link
        href="/"
        className="inline-block rounded text-sm text-indigo-600 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        ← Voltar para a listagem
      </Link>
    </div>
  );
}
