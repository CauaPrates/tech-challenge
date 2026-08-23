import type { PaginatedTransactions, TransactionResponse } from '@challenge/contracts';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_URL, comFiltrosNaUrl, empurrar, renderComQuery } from '@/test/render';
import { servidor } from '@/test/servidor';

import { PainelTransacoes } from './painel-transacoes';

function transacao(sobrescreve: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    transactionExternalId: '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33',
    transactionType: { name: 'transferencia' },
    transactionStatus: { name: 'pendente' },
    value: 120,
    createdAt: '2026-08-21T13:00:00.000Z',
    ...sobrescreve,
  };
}

function pagina(sobrescreve: Partial<PaginatedTransactions> = {}): PaginatedTransactions {
  return { data: [transacao()], page: 1, pageSize: 20, total: 1, totalPages: 1, ...sobrescreve };
}

function responder(corpo: PaginatedTransactions): void {
  servidor.use(http.get(`${API_URL}/transactions`, () => HttpResponse.json(corpo)));
}

beforeEach(() => {
  empurrar.mockClear();
  comFiltrosNaUrl('');
});

describe('estado de carregamento', () => {
  it('exibe carregando antes da resposta chegar', () => {
    servidor.use(
      http.get(`${API_URL}/transactions`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));

        return HttpResponse.json(pagina());
      }),
    );
    renderComQuery(<PainelTransacoes />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando transações');
  });
});

describe('estado de erro', () => {
  it('comunica a falha e oferece tentar novamente', async () => {
    servidor.use(
      http.get(`${API_URL}/transactions`, () =>
        HttpResponse.json({ message: 'banco indisponivel' }, { status: 500 }),
      ),
    );
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByRole('alert')).toHaveTextContent('banco indisponivel');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('recarrega ao clicar em tentar novamente', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(`${API_URL}/transactions`, () => {
        chamadas += 1;

        return chamadas === 1
          ? HttpResponse.json({ message: 'falhou' }, { status: 500 })
          : HttpResponse.json(pagina());
      }),
    );
    renderComQuery(<PainelTransacoes />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});

describe('estado vazio', () => {
  it('distingue vazio de verdade de vazio por filtro', async () => {
    responder(pagina({ data: [], total: 0, totalPages: 0 }));
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByText('Nenhuma transação registrada')).toBeInTheDocument();
  });

  it('avisa que o filtro nao trouxe resultado quando ha filtro aplicado', async () => {
    comFiltrosNaUrl('status=aprovada');
    responder(pagina({ data: [], total: 0, totalPages: 0 }));
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByText('Nenhuma transação para este filtro')).toBeInTheDocument();
  });
});

describe('listagem', () => {
  it('mostra as transacoes com status e total', async () => {
    responder(pagina({ data: [transacao({ transactionStatus: { name: 'aprovada' } })] }));
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    // o mesmo texto existe nas opcoes do filtro; o selector isola o badge da linha
    expect(screen.getByText('aprovada', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/1 no total/)).toBeInTheDocument();
  });

  it('desabilita a paginacao quando ha uma unica pagina', async () => {
    responder(pagina());
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('navega para a proxima pagina pela URL', async () => {
    responder(pagina({ total: 40, totalPages: 2 }));
    renderComQuery(<PainelTransacoes />);

    await userEvent.click(await screen.findByRole('button', { name: 'Próxima' }));

    expect(empurrar).toHaveBeenCalledWith('/?page=2');
  });
});

describe('filtros', () => {
  it('escreve o filtro na URL, para o link ser compartilhavel', async () => {
    responder(pagina());
    renderComQuery(<PainelTransacoes />);
    await screen.findByRole('table');

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'aprovada');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(empurrar).toHaveBeenCalledWith('/?status=aprovada');
  });

  it('volta para a primeira pagina ao trocar de filtro', async () => {
    comFiltrosNaUrl('page=3');
    responder(pagina({ page: 3, total: 60, totalPages: 3 }));
    renderComQuery(<PainelTransacoes />);
    await screen.findByRole('table');

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'pendente');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(empurrar).toHaveBeenCalledWith('/?status=pendente');
  });

  it('limpa todos os filtros', async () => {
    comFiltrosNaUrl('status=aprovada&transferTypeId=2');
    responder(pagina());
    renderComQuery(<PainelTransacoes />);
    await screen.findByRole('table');

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(empurrar).toHaveBeenCalledWith('/');
  });

  it('repovoa os filtros a partir da URL', async () => {
    comFiltrosNaUrl('status=rejeitada&transferTypeId=3&from=2026-08-01');
    responder(pagina());
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByLabelText('Status')).toHaveValue('rejeitada');
    expect(screen.getByLabelText('Tipo')).toHaveValue('3');
    expect(screen.getByLabelText('De')).toHaveValue('2026-08-01');
  });
});

describe('polling adaptativo', () => {
  it('busca de novo enquanto ha pendente, e a tela passa a mostrar o status final', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(`${API_URL}/transactions`, () => {
        chamadas += 1;

        return HttpResponse.json(
          chamadas === 1
            ? pagina()
            : pagina({ data: [transacao({ transactionStatus: { name: 'aprovada' } })] }),
        );
      }),
    );
    renderComQuery(<PainelTransacoes />);

    expect(await screen.findByText('pendente', { selector: 'span' })).toBeInTheDocument();

    // ninguem clicou em nada: o status muda sozinho porque a tela voltou a buscar
    expect(
      await screen.findByText('aprovada', { selector: 'span' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(chamadas).toBeGreaterThan(1);
  });

  it('para de buscar quando nao ha mais pendente na tela', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(`${API_URL}/transactions`, () => {
        chamadas += 1;

        return HttpResponse.json(
          pagina({ data: [transacao({ transactionStatus: { name: 'aprovada' } })] }),
        );
      }),
    );
    renderComQuery(<PainelTransacoes />);
    await screen.findByText('aprovada', { selector: 'span' });

    // intervalo do teste e 50ms; 600ms dariam mais de dez buscas se o polling nao desligasse
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(chamadas).toBe(1);
  });
});
