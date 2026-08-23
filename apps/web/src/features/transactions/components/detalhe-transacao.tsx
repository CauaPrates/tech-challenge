'use client';

import Link from 'next/link';

import { EstadoDeCarregamento, EstadoDeErro, EstadoVazio } from '@/components/ui/estados';

import { ErroDaApi } from '../api/client';
import { formatarDataHora, formatarValor } from '../formato';
import { useTransacao } from '../hooks/use-transacao';
import { StatusBadge } from './status-badge';

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-600">{rotulo}</dt>
      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{children}</dd>
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
        descricao="O identificador informado não corresponde a nenhuma transação."
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

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-blue-700 underline">
        Voltar para a listagem
      </Link>

      <dl className="rounded border border-slate-200 bg-white">
        <Campo rotulo="Identificador">
          <span className="font-mono text-xs">{transacao.transactionExternalId}</span>
        </Campo>
        <Campo rotulo="Status">
          <StatusBadge status={transacao.transactionStatus.name} />
        </Campo>
        <Campo rotulo="Tipo">{transacao.transactionType.name}</Campo>
        <Campo rotulo="Valor">{formatarValor(transacao.value)}</Campo>
        <Campo rotulo="Conta de débito">
          <span className="font-mono text-xs">{transacao.accountExternalIdDebit}</span>
        </Campo>
        <Campo rotulo="Conta de crédito">
          <span className="font-mono text-xs">{transacao.accountExternalIdCredit}</span>
        </Campo>
        <Campo rotulo="Criada em">{formatarDataHora(transacao.createdAt)}</Campo>
        <Campo rotulo="Última alteração">{formatarDataHora(transacao.updatedAt)}</Campo>
      </dl>
    </div>
  );
}
