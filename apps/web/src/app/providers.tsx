'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // criado no estado, e nao no modulo: no App Router o modulo e compartilhado entre requisicoes
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
