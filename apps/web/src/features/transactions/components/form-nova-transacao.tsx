'use client';

import { type CreateTransactionInput, createTransactionSchema } from '@challenge/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { type FieldError, useForm } from 'react-hook-form';

import { ErroDaApi } from '../api/client';
import { useCriarTransacao } from '../hooks/use-criar-transacao';

const CONTAS = [
  { nome: 'accountExternalIdDebit', rotulo: 'Conta de débito' },
  { nome: 'accountExternalIdCredit', rotulo: 'Conta de crédito' },
] as const;

/**
 * O rotulo se associa ao campo por htmlFor, e a mensagem de erro fica FORA do label. Erro dentro
 * do label mudaria o texto acessivel do campo cada vez que a validacao falhasse.
 */
function Campo({
  id,
  rotulo,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  erro: FieldError | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {erro !== undefined && (
        <span role="alert" className="text-xs text-red-700">
          {erro.message}
        </span>
      )}
    </div>
  );
}

export function FormNovaTransacao() {
  const router = useRouter();
  const criacao = useCriarTransacao();

  // o mesmo schema que o backend aplica na entrada: a regra de campo obrigatorio mora num lugar
  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      accountExternalIdDebit: '',
      accountExternalIdCredit: '',
      transferTypeId: 1,
      value: 0,
    },
  });

  async function enviar(entrada: CreateTransactionInput): Promise<void> {
    try {
      const criada = await criacao.mutateAsync(entrada);

      router.push(`/transacoes/${criada.transactionExternalId}`);
    } catch (erro) {
      // erro de campo devolvido pela API e posicionado no campo, nao num aviso genérico
      if (erro instanceof ErroDaApi) {
        for (const campo of erro.campos) {
          if (campo.path in form.getValues()) {
            form.setError(campo.path as keyof CreateTransactionInput, { message: campo.message });
          }
        }
      }
    }
  }

  const erroGeral =
    criacao.error instanceof ErroDaApi
      ? criacao.error.campos.length === 0
        ? criacao.error.message
        : undefined
      : criacao.error?.message;

  return (
    <form
      onSubmit={(evento) => void form.handleSubmit(enviar)(evento)}
      aria-label="Nova transação"
      noValidate
      className="max-w-xl space-y-4 rounded border border-slate-200 bg-white p-6"
    >
      {CONTAS.map((campo) => (
        <Campo
          key={campo.nome}
          id={campo.nome}
          rotulo={campo.rotulo}
          erro={form.formState.errors[campo.nome]}
        >
          <input
            id={campo.nome}
            type="text"
            placeholder="00000000-0000-4000-8000-000000000000"
            aria-invalid={form.formState.errors[campo.nome] !== undefined}
            {...form.register(campo.nome)}
            className="rounded border border-slate-300 px-3 py-2 font-mono text-xs"
          />
        </Campo>
      ))}

      <Campo id="transferTypeId" rotulo="Tipo" erro={form.formState.errors.transferTypeId}>
        <select
          id="transferTypeId"
          {...form.register('transferTypeId', { valueAsNumber: true })}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value={1}>transferencia</option>
          <option value={2}>pagamento</option>
          <option value={3}>deposito</option>
        </select>
      </Campo>

      <Campo id="value" rotulo="Valor" erro={form.formState.errors.value}>
        <input
          id="value"
          type="number"
          step="0.01"
          aria-invalid={form.formState.errors.value !== undefined}
          {...form.register('value', { valueAsNumber: true })}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </Campo>

      {erroGeral !== undefined && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {erroGeral}
        </p>
      )}

      <button
        type="submit"
        disabled={criacao.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {criacao.isPending ? 'Criando...' : 'Criar transação'}
      </button>
    </form>
  );
}
