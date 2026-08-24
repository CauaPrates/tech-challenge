import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_URL, empurrar, renderComQuery } from '@/test/render';
import { servidor } from '@/test/servidor';

import { FormNovaTransacao } from './form-nova-transacao';

const DEBITO = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const CREDITO = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CRIADA = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';

/** Le o valor vivo do campo, sem cast: narrowing por instanceof resolve o tipo. */
function valorDe(rotulo: string): string {
  const campo = screen.getByLabelText(rotulo);

  return campo instanceof HTMLInputElement ? campo.value : '';
}

/** Os campos de conta já vêm preenchidos, então limpar antes de digitar é obrigatório. */
async function trocar(rotulo: string, valor: string) {
  const campo = screen.getByLabelText(rotulo);

  await userEvent.clear(campo);

  if (valor !== '') {
    await userEvent.type(campo, valor);
  }
}

async function preencher(valores: { debito?: string; credito?: string; valor?: string } = {}) {
  // o select de tipo só ganha opções quando a API responde, e o envio fica travado até lá
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Criar transação' })).toBeEnabled();
  });
  await trocar('Conta de débito', valores.debito ?? DEBITO);
  await trocar('Conta de crédito', valores.credito ?? CREDITO);
  await trocar('Valor', valores.valor ?? '120');
}

function enviar() {
  return userEvent.click(screen.getByRole('button', { name: 'Criar transação' }));
}

function respostaDeSucesso() {
  return HttpResponse.json(
    {
      transactionExternalId: CRIADA,
      transactionType: { name: 'transferencia' },
      transactionStatus: { name: 'pendente' },
      value: 120,
      createdAt: '2026-08-21T13:00:00.000Z',
    },
    { status: 201 },
  );
}

beforeEach(() => {
  empurrar.mockClear();
});

describe('validacao antes do envio', () => {
  it('nao envia nada quando os campos sao esvaziados', async () => {
    const chamado = vi.fn();
    servidor.use(
      http.post(`${API_URL}/transactions`, () => {
        chamado();

        return respostaDeSucesso();
      }),
    );
    renderComQuery(<FormNovaTransacao />);

    await preencher({ debito: '', credito: '', valor: '' });
    await enviar();

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(chamado).not.toHaveBeenCalled();
  });

  it('vem preenchido com contas validas, para a tela ser usavel sem adivinhacao', () => {
    renderComQuery(<FormNovaTransacao />);

    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const debito = valorDe('Conta de débito');
    const credito = valorDe('Conta de crédito');

    expect(debito).toMatch(uuid);
    expect(credito).toMatch(uuid);
    expect(debito).not.toBe(credito);
  });

  it('gera um identificador novo no clique, sem mexer no outro campo', async () => {
    renderComQuery(<FormNovaTransacao />);
    const antes = valorDe('Conta de débito');
    const creditoAntes = valorDe('Conta de crédito');

    await userEvent.click(screen.getAllByRole('button', { name: 'Gerar identificador' })[0]!);

    expect(screen.getByLabelText('Conta de débito')).not.toHaveValue(antes);
    expect(screen.getByLabelText('Conta de crédito')).toHaveValue(creditoAntes);
  });

  it('carrega os tipos da API em vez de chumbar no componente', async () => {
    renderComQuery(<FormNovaTransacao />);

    expect(await screen.findByRole('option', { name: 'transferencia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'pagamento' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'deposito' })).toBeInTheDocument();
  });

  it('aponta o erro no campo de conta invalida', async () => {
    renderComQuery(<FormNovaTransacao />);

    await preencher({ debito: 'conta-1' });
    await enviar();

    await waitFor(() => {
      expect(screen.getByLabelText('Conta de débito')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('recusa valor zero', async () => {
    renderComQuery(<FormNovaTransacao />);

    await preencher({ valor: '0' });
    await enviar();

    await waitFor(() => {
      expect(screen.getByLabelText('Valor')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('recusa valor com mais de duas casas decimais', async () => {
    renderComQuery(<FormNovaTransacao />);

    await preencher({ valor: '120.555' });
    await enviar();

    await waitFor(() => {
      expect(screen.getByLabelText('Valor')).toHaveAttribute('aria-invalid', 'true');
    });
  });
});

describe('envio', () => {
  it('cria e navega para o detalhe da transacao criada', async () => {
    servidor.use(http.post(`${API_URL}/transactions`, () => respostaDeSucesso()));
    renderComQuery(<FormNovaTransacao />);

    await preencher();
    await enviar();

    await waitFor(() => {
      expect(empurrar).toHaveBeenCalledWith(`/transacoes/${CRIADA}`);
    });
  });

  it('desabilita o botao durante o envio, para nao criar duas vezes', async () => {
    servidor.use(
      http.post(`${API_URL}/transactions`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        return respostaDeSucesso();
      }),
    );
    renderComQuery(<FormNovaTransacao />);

    await preencher();
    await enviar();

    expect(await screen.findByRole('button', { name: 'Criando...' })).toBeDisabled();
  });

  it('envia o payload no formato do contrato', async () => {
    let corpo: unknown;
    servidor.use(
      http.post(`${API_URL}/transactions`, async ({ request }) => {
        corpo = await request.json();

        return respostaDeSucesso();
      }),
    );
    renderComQuery(<FormNovaTransacao />);

    await preencher({ valor: '1500.5' });
    await enviar();

    await waitFor(() => {
      expect(corpo).toEqual({
        accountExternalIdDebit: DEBITO,
        accountExternalIdCredit: CREDITO,
        transferTypeId: 1,
        value: 1500.5,
      });
    });
  });
});

describe('falha na criacao', () => {
  it('comunica o erro e preserva o que foi digitado', async () => {
    servidor.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json({ message: 'banco indisponivel' }, { status: 500 }),
      ),
    );
    renderComQuery(<FormNovaTransacao />);

    await preencher();
    await enviar();

    expect(await screen.findByText('banco indisponivel')).toBeInTheDocument();
    expect(screen.getByLabelText('Conta de débito')).toHaveValue(DEBITO);
    expect(screen.getByLabelText('Valor')).toHaveValue(120);
    expect(empurrar).not.toHaveBeenCalled();
  });

  it('posiciona no campo o erro que a API devolveu', async () => {
    servidor.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json(
          {
            message: 'requisicao invalida',
            details: [{ path: 'value', message: 'deve ser maior que zero' }],
          },
          { status: 400 },
        ),
      ),
    );
    renderComQuery(<FormNovaTransacao />);

    await preencher();
    await enviar();

    expect(await screen.findByText('deve ser maior que zero')).toBeInTheDocument();
  });
});
