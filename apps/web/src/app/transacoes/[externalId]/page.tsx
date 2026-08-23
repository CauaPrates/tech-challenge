import { DetalheTransacao } from '@/features/transactions/components/detalhe-transacao';

export default async function DetalhePage({ params }: { params: Promise<{ externalId: string }> }) {
  const { externalId } = await params;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Detalhe da transação</h1>
      <DetalheTransacao externalId={externalId} />
    </section>
  );
}
