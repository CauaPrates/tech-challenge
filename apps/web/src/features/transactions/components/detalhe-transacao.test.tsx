import type { TransactionDetail } from '@challenge/contracts';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL, renderComQuery } from '@/test/render';
import { servidor } from '@/test/servidor';

import { DetalheTransacao } from './detalhe-transacao';

const EXTERNAL_ID = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';

function detalhe(sobrescreve: Partial<TransactionDetail> = {}): TransactionDetail {
  return {
    transactionExternalId: EXTERNAL_ID,
    transactionType: { name: 'transferencia' },
    transactionStatus: { name: 'pendente' },
    value: 120.5,
    createdAt: '2026-08-21T13:00:00.000Z',
    accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    accountExternalIdCredit: '0f8fad5b-d9cb-469f-a165-70867728950e',
    updatedAt: '2026-08-21T13:00:02.000Z',
    ...sobrescreve,
  };
}

function responder(corpo: TransactionDetail): void {
  servidor.use(http.get(`${API_URL}/transactions/:id`, () => HttpResponse.json(corpo)));
}

describe('estados de tela', () => {
  it('exibe carregando antes da resposta', () => {
    servidor.use(
      http.get(`${API_URL}/transactions/:id`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));

        return HttpResponse.json(detalhe());
      }),
    );
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando transação');
  });

  it('trata nao encontrado como resposta, nao como erro de sistema', async () => {
    servidor.use(
      http.get(`${API_URL}/transactions/:id`, () =>
        HttpResponse.json({ message: 'transacao nao encontrada' }, { status: 404 }),
      ),
    );
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);

    expect(await screen.findByText('Transação não encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exibe erro com acao de tentar novamente quando a API falha', async () => {
    servidor.use(
      http.get(`${API_URL}/transactions/:id`, () =>
        HttpResponse.json({ message: 'banco indisponivel' }, { status: 500 }),
      ),
    );
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);

    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'banco indisponivel',
    );
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});

describe('conteudo', () => {
  it('exibe todos os campos do detalhe', async () => {
    responder(detalhe({ transactionStatus: { name: 'aprovada' } }));
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);

    expect(await screen.findByText(EXTERNAL_ID)).toBeInTheDocument();
    expect(screen.getByText('aprovada')).toBeInTheDocument();
    expect(screen.getByText('transferencia')).toBeInTheDocument();
    expect(screen.getByText('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBeInTheDocument();
    expect(screen.getByText('0f8fad5b-d9cb-469f-a165-70867728950e')).toBeInTheDocument();
  });

  it('mostra criada em e ultima alteracao, que e a evidencia da mudanca assincrona', async () => {
    responder(detalhe());
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);

    expect(await screen.findByText('Criada em')).toBeInTheDocument();
    expect(screen.getByText('Última alteração')).toBeInTheDocument();
  });
});

describe('atualizacao automatica', () => {
  it('reflete a mudanca de status sem interacao do usuario', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(`${API_URL}/transactions/:id`, () => {
        chamadas += 1;

        return HttpResponse.json(
          chamadas === 1 ? detalhe() : detalhe({ transactionStatus: { name: 'rejeitada' } }),
        );
      }),
    );
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);

    expect(await screen.findByText('pendente')).toBeInTheDocument();
    expect(await screen.findByText('rejeitada', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('para de buscar depois que o status vira final', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(`${API_URL}/transactions/:id`, () => {
        chamadas += 1;

        return HttpResponse.json(detalhe({ transactionStatus: { name: 'aprovada' } }));
      }),
    );
    renderComQuery(<DetalheTransacao externalId={EXTERNAL_ID} />);
    await screen.findByText('aprovada');

    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(chamadas).toBe(1);
  });
});
