import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Transações',
  description: 'Painel de transações com validação antifraude assíncrona',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <Providers>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold">
                Transações
              </Link>
              <Link
                href="/transacoes/nova"
                className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
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
