import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Transações · painel',
  description: 'Painel de transações com validação antifraude assíncrona',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <header className="border-b border-slate-800 bg-slate-900">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
              <Link
                href="/"
                className="flex items-baseline gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400"
              >
                <span className="text-base font-semibold tracking-tight text-white">
                  Transações
                </span>
                <span className="hidden text-xs text-slate-400 sm:inline">
                  validação antifraude assíncrona
                </span>
              </Link>
              <Link
                href="/transacoes/nova"
                className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-xs hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Nova transação
              </Link>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
