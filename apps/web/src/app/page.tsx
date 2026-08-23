import { Suspense } from 'react';

import { EstadoDeCarregamento } from '@/components/ui/estados';
import { PainelTransacoes } from '@/features/transactions/components/painel-transacoes';

export default function Home() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transações</h1>
        <p className="mt-1 text-sm text-slate-600">
          Transações nascem pendentes e mudam de status por evento. Esta tela acompanha essa mudança
          sozinha enquanto houver alguma pendente.
        </p>
      </div>
      {/* useSearchParams exige Suspense no App Router */}
      <Suspense fallback={<EstadoDeCarregamento rotulo="Carregando transações" />}>
        <PainelTransacoes />
      </Suspense>
    </section>
  );
}
