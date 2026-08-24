import Link from 'next/link';

import { FormNovaTransacao } from '@/features/transactions/components/form-nova-transacao';

export default function NovaTransacaoPage() {
  return (
    <section className="space-y-5">
      <div>
        <Link
          href="/"
          className="rounded text-sm text-indigo-600 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          ← Voltar para a listagem
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Nova transação</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          As contas são identificadores opacos — não há cadastro de contas neste escopo. Os campos
          já vêm preenchidos com identificadores válidos, e você pode gerar outros.
        </p>
      </div>
      <FormNovaTransacao />
    </section>
  );
}
