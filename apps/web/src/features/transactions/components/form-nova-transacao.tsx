'use client';

import { type CreateTransactionInput, createTransactionSchema } from '@challenge/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { type FieldError, useForm } from 'react-hook-form';

import { ErroDaApi } from '../api/client';
import { useCriarTransacao } from '../hooks/use-criar-transacao';
import { useTipos } from '../hooks/use-tipos';
import { CampoConta } from './campo-conta';

const CONTAS = [
  { nome: 'accountExternalIdDebit', rotulo: 'Conta de débito' },
  { nome: 'accountExternalIdCredit', rotulo: 'Conta de crédito' },
] as const;

const CLASSE_ENTRADA =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-100 aria-invalid:border-red-400 aria-invalid:ring-red-100';

function novaConta(): string {
  return globalThis.crypto.randomUUID();
}

/** O rótulo se associa por htmlFor e o erro fica FORA do label, para o texto acessível não mudar. */
function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  erro: FieldError | undefined;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      {children}
      {erro === undefined ? (
        dica !== undefined && <span className="text-xs text-slate-500">{dica}</span>
      ) : (
        <span role="alert" className="text-xs font-medium text-red-700">
          {erro.message}
        </span>
      )}
    </div>
  );
}

export function FormNovaTransacao() {
  const router = useRouter();
  const criacao = useCriarTransacao();
  const tipos = useTipos();

  // o mesmo schema que o backend aplica na entrada: a regra de campo obrigatorio mora num lugar
  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      // Ja vem preenchido: nao existe cadastro de contas, entao ninguem tem de onde tirar um
      // UUID valido. Nao ha risco de hidratacao porque o register do react-hook-form nao emite
      // atributo value — ele aplica por ref no cliente, e o SSR sai com o campo vazio.
      accountExternalIdDebit: novaConta(),
      accountExternalIdCredit: novaConta(),
      transferTypeId: 1,
      value: 100,
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
      className="max-w-2xl space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-xs"
    >
      {CONTAS.map((campo) => (
        <CampoConta
          key={campo.nome}
          id={campo.nome}
          rotulo={campo.rotulo}
          erro={form.formState.errors[campo.nome]}
          onGerar={() => {
            form.setValue(campo.nome, novaConta(), { shouldValidate: true });
          }}
        >
          <input
            id={campo.nome}
            type="text"
            spellCheck={false}
            aria-invalid={form.formState.errors[campo.nome] !== undefined}
            {...form.register(campo.nome)}
            className={`${CLASSE_ENTRADA} font-mono text-xs`}
          />
        </CampoConta>
      ))}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="transferTypeId" rotulo="Tipo" erro={form.formState.errors.transferTypeId}>
          <select
            id="transferTypeId"
            disabled={tipos.isPending}
            {...form.register('transferTypeId', { valueAsNumber: true })}
            className={CLASSE_ENTRADA}
          >
            {tipos.data === undefined ? (
              // mantem um valor valido enquanto carrega: select vazio produziria NaN no envio
              <option value={1}>carregando...</option>
            ) : (
              tipos.data.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.name}
                </option>
              ))
            )}
          </select>
        </Campo>

        <Campo
          id="value"
          rotulo="Valor"
          erro={form.formState.errors.value}
          dica="Acima de 1000 é rejeitado pelo antifraude."
        >
          <input
            id="value"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            aria-invalid={form.formState.errors.value !== undefined}
            {...form.register('value', { valueAsNumber: true })}
            className={`${CLASSE_ENTRADA} text-right tabular-nums`}
          />
        </Campo>
      </div>

      {erroGeral !== undefined && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {erroGeral}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={criacao.isPending || tipos.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {criacao.isPending ? 'Criando...' : 'Criar transação'}
        </button>
        <p className="text-xs text-slate-500">
          A transação nasce pendente. O status muda em seguida, por evento.
        </p>
      </div>
    </form>
  );
}
