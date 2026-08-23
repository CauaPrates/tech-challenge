import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as renderRtl } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

export const API_URL = 'http://localhost:3001';

export const empurrar = vi.fn<(caminho: string) => void>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: empurrar, replace: empurrar }),
  useSearchParams: () => new URLSearchParams(globalThis.location.search),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

export function renderComQuery(elemento: ReactElement) {
  const cliente = new QueryClient({
    // retry desligado no teste: falha proposital tem de virar estado de erro na hora
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return renderRtl(<QueryClientProvider client={cliente}>{elemento}</QueryClientProvider>);
}

export function comFiltrosNaUrl(query: string): void {
  globalThis.history.replaceState({}, '', query === '' ? '/' : `/?${query}`);
}
