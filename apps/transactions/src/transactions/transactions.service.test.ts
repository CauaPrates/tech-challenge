import { TOPICS } from '@challenge/contracts';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionNotFoundError, TransactionTypeNotFoundError } from '../common/errors';
import type { NovaMensagemDeOutbox, OutboxRepository } from '../outbox/outbox.repository';
import type { PrismaService } from '../prisma/prisma.service';
import type {
  NovaTransacao,
  TransacaoComTipo,
  TransactionsRepository,
} from './transactions.repository';
import { TransactionsService } from './transactions.service';

const EXTERNAL_ID = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';
const CRIADA_EM = new Date('2026-08-21T13:00:00.000Z');

const entrada = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '0f8fad5b-d9cb-469f-a165-70867728950e',
  transferTypeId: 1,
  value: 120,
};

function transacaoFalsa(sobrescreve: Partial<TransacaoComTipo> = {}): TransacaoComTipo {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    externalId: EXTERNAL_ID,
    accountExternalIdDebit: entrada.accountExternalIdDebit,
    accountExternalIdCredit: entrada.accountExternalIdCredit,
    typeId: 1,
    status: 'PENDENTE',
    value: new Prisma.Decimal('120.00'),
    createdAt: CRIADA_EM,
    updatedAt: CRIADA_EM,
    type: { id: 1, name: 'transferencia' },
    ...sobrescreve,
  };
}

function montar() {
  // as assinaturas sao explicitas para mock.calls chegar tipado: vi.fn() sem tipo devolve any,
  // e any em teste esconde exatamente o que o teste deveria provar
  const transacoes = {
    criar: vi.fn<(tx: unknown, dados: NovaTransacao) => Promise<TransacaoComTipo>>(),
    buscarPorExternalId: vi.fn<(externalId: string) => Promise<TransacaoComTipo | null>>(),
    tipoExiste: vi.fn<(tx: unknown, typeId: number) => Promise<boolean>>().mockResolvedValue(true),
    listar: vi
      .fn<
        (
          where: unknown,
          page: number,
          pageSize: number,
        ) => Promise<{ itens: TransacaoComTipo[]; total: number }>
      >()
      .mockResolvedValue({ itens: [], total: 0 }),
  };
  const outbox = {
    enfileirar: vi.fn<(tx: unknown, mensagem: NovaMensagemDeOutbox) => Promise<void>>(),
    contarPendentes: vi.fn<() => Promise<number>>(),
  };

  // roda o callback com um cliente falso; se o callback lancar, a transacao "falha" inteira
  const prisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };

  const service = new TransactionsService(
    prisma as unknown as PrismaService,
    transacoes as unknown as TransactionsRepository,
    outbox as unknown as OutboxRepository,
  );

  return { service, transacoes, outbox, prisma };
}

describe('criar', () => {
  let contexto: ReturnType<typeof montar>;

  beforeEach(() => {
    contexto = montar();
    contexto.transacoes.criar.mockResolvedValue(transacaoFalsa());
  });

  it('grava a transacao como pendente e devolve o contrato de leitura', async () => {
    const resposta = await contexto.service.criar(entrada);

    expect(resposta).toEqual({
      transactionExternalId: EXTERNAL_ID,
      transactionType: { name: 'transferencia' },
      transactionStatus: { name: 'pendente' },
      value: 120,
      createdAt: '2026-08-21T13:00:00.000Z',
    });
  });

  it('enfileira o evento de criacao dentro da MESMA transacao de banco', async () => {
    await contexto.service.criar(entrada);

    expect(contexto.prisma.$transaction).toHaveBeenCalledOnce();
    // o cliente recebido pelo outbox tem de ser o mesmo que o do insert da transacao
    const clienteDaTransacao = contexto.transacoes.criar.mock.calls[0]?.[0];
    const clienteDoOutbox = contexto.outbox.enfileirar.mock.calls[0]?.[0];
    expect(clienteDoOutbox).toBe(clienteDaTransacao);
  });

  it('publica o valor como string decimal de duas casas, nunca como number', async () => {
    contexto.transacoes.criar.mockResolvedValue(
      transacaoFalsa({ value: new Prisma.Decimal('1000.5') }),
    );

    await contexto.service.criar(entrada);

    expect(contexto.outbox.enfileirar.mock.calls[0]?.[1]).toMatchObject({
      eventName: TOPICS.transactionCreated,
      aggregateId: EXTERNAL_ID,
      payload: { transactionExternalId: EXTERNAL_ID, transferTypeId: 1, value: '1000.50' },
    });
  });

  it('recusa tipo inexistente sem gravar nada', async () => {
    contexto.transacoes.tipoExiste.mockResolvedValue(false);

    await expect(contexto.service.criar(entrada)).rejects.toThrow(TransactionTypeNotFoundError);
    expect(contexto.transacoes.criar).not.toHaveBeenCalled();
    expect(contexto.outbox.enfileirar).not.toHaveBeenCalled();
  });

  it('se o outbox falhar, a transacao inteira falha: nao sobra transacao sem evento', async () => {
    contexto.outbox.enfileirar.mockRejectedValue(new Error('outbox fora'));

    await expect(contexto.service.criar(entrada)).rejects.toThrow('outbox fora');
  });
});

describe('buscarPorExternalId', () => {
  it('devolve o contrato de leitura quando existe', async () => {
    const contexto = montar();
    contexto.transacoes.buscarPorExternalId.mockResolvedValue(
      transacaoFalsa({ status: 'APROVADA' }),
    );

    const resposta = await contexto.service.buscarPorExternalId(EXTERNAL_ID);

    expect(resposta.transactionStatus).toEqual({ name: 'aprovada' });
  });

  it('lanca not found quando nao existe', async () => {
    const contexto = montar();
    contexto.transacoes.buscarPorExternalId.mockResolvedValue(null);

    await expect(contexto.service.buscarPorExternalId(EXTERNAL_ID)).rejects.toThrow(
      TransactionNotFoundError,
    );
  });
});

describe('listar', () => {
  it('devolve a pagina mapeada com total e total de paginas', async () => {
    const contexto = montar();
    contexto.transacoes.listar.mockResolvedValue({ itens: [transacaoFalsa()], total: 137 });

    const resposta = await contexto.service.listar({ page: 2, pageSize: 20 });

    expect(resposta).toMatchObject({ page: 2, pageSize: 20, total: 137, totalPages: 7 });
    expect(resposta.data[0]?.transactionExternalId).toBe(EXTERNAL_ID);
  });

  it('devolve lista vazia com o total real quando a pagina passa do fim', async () => {
    const contexto = montar();
    contexto.transacoes.listar.mockResolvedValue({ itens: [], total: 5 });

    const resposta = await contexto.service.listar({ page: 99, pageSize: 20 });

    expect(resposta.data).toEqual([]);
    expect(resposta.total).toBe(5);
  });
});
