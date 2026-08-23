import { Suspense } from 'react';

import { EstadoDeCarregamento } from '@/components/ui/estados';
import { PainelTransacoes } from '@/features/transactions/components/painel-transacoes';

export default function Home() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Transações</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Cada transação nasce pendente e é avaliada por um serviço independente. O status muda fora
          do ciclo da requisição — esta tela acompanha essa mudança sozinha.
        </p>
      </div>
      {/* useSearchParams exige Suspense no App Router */}
      <Suspense fallback={<EstadoDeCarregamento rotulo="Carregando transações" />}>
        <PainelTransacoes />
      </Suspense>
    </section>
  );
}
