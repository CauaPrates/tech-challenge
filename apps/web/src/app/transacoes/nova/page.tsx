import { FormNovaTransacao } from '@/features/transactions/components/form-nova-transacao';

export default function NovaTransacaoPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova transação</h1>
        <p className="mt-1 text-sm text-slate-600">
          A transação é criada como pendente. O status muda depois, quando o antifraude devolver o
          veredito.
        </p>
      </div>
      <FormNovaTransacao />
    </section>
  );
}
