import { TOPICS, type TransactionStatusUpdatedEvent } from '@challenge/contracts';
import { ErroDefinitivo, type KafkaConsumerRunner } from '@challenge/messaging';
import type { TransactionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../prisma/prisma.service';
import { StatusUpdatedConsumer } from './status-updated.consumer';
import type { TransactionsRepository } from './transactions.repository';

const EXTERNAL_ID = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';
const ID_INTERNO = '11111111-1111-4111-8111-111111111111';

function evento(
  status: 'APROVADA' | 'REJEITADA' = 'APROVADA',
  eventId = 'e7d2f9a1-1111-4222-8333-444455556666',
): TransactionStatusUpdatedEvent {
  return {
    eventId,
    eventName: TOPICS.transactionStatusUpdated,
    eventVersion: 1,
    occurredAt: '2026-08-21T13:00:02.180Z',
    payload: { transactionExternalId: EXTERNAL_ID, status, reason: 'motivo do veredito' },
  };
}

function montar() {
  const transacoes = {
    travarPorExternalId: vi
      .fn<
        (
          tx: unknown,
          externalId: string,
        ) => Promise<{ id: string; status: TransactionStatus } | null>
      >()
      .mockResolvedValue({ id: ID_INTERNO, status: 'PENDENTE' }),
    atualizarStatus: vi.fn<(tx: unknown, id: string, status: string) => Promise<void>>(),
    criar: vi.fn(),
    buscarPorExternalId: vi.fn(),
    tipoExiste: vi.fn(),
  };

  const processados = {
    registrar: vi.fn<(tx: unknown, e: unknown) => Promise<boolean>>().mockResolvedValue(true),
  };

  const prisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };

  const config = { get: vi.fn(() => 'transactions-consumer') };
  const runner = { registrar: vi.fn() };

  const consumer = new StatusUpdatedConsumer(
    config as unknown as ConstructorParameters<typeof StatusUpdatedConsumer>[0],
    runner as unknown as KafkaConsumerRunner,
    prisma as unknown as PrismaService,
    transacoes as unknown as TransactionsRepository,
    processados,
  );

  return { consumer, transacoes, processados, prisma, runner };
}

describe('caminho normal', () => {
  let contexto: ReturnType<typeof montar>;

  beforeEach(() => {
    contexto = montar();
  });

  it('atualiza o status de PENDENTE para o veredito recebido', async () => {
    await contexto.consumer.processar(evento('APROVADA'));

    expect(contexto.transacoes.atualizarStatus).toHaveBeenCalledWith(
      expect.anything(),
      ID_INTERNO,
      'APROVADA',
    );
  });

  it('registra o evento e aplica o efeito na MESMA transacao de banco', async () => {
    await contexto.consumer.processar(evento());

    expect(contexto.prisma.$transaction).toHaveBeenCalledOnce();
    const txDoRegistro = contexto.processados.registrar.mock.calls[0]?.[0];
    const txDaAtualizacao = contexto.transacoes.atualizarStatus.mock.calls[0]?.[0];
    expect(txDaAtualizacao).toBe(txDoRegistro);
  });

  it('registra a guarda antes de tocar na transacao', async () => {
    await contexto.consumer.processar(evento());

    expect(contexto.processados.registrar.mock.invocationCallOrder[0]).toBeLessThan(
      contexto.transacoes.travarPorExternalId.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it('trava a linha antes de decidir a transicao', async () => {
    await contexto.consumer.processar(evento());

    expect(contexto.transacoes.travarPorExternalId).toHaveBeenCalledWith(
      expect.anything(),
      EXTERNAL_ID,
    );
  });
});

describe('entrega duplicada', () => {
  it('nao aplica nada quando o evento ja foi processado', async () => {
    const contexto = montar();
    contexto.processados.registrar.mockResolvedValue(false);

    await contexto.consumer.processar(evento());

    expect(contexto.transacoes.travarPorExternalId).not.toHaveBeenCalled();
    expect(contexto.transacoes.atualizarStatus).not.toHaveBeenCalled();
  });

  it('nao lanca erro: duplicata e caminho esperado, nao falha', async () => {
    const contexto = montar();
    contexto.processados.registrar.mockResolvedValue(false);

    await expect(contexto.consumer.processar(evento())).resolves.toBeUndefined();
  });
});

describe('transacao ja finalizada', () => {
  it.each<[TransactionStatus, 'APROVADA' | 'REJEITADA']>([
    ['APROVADA', 'REJEITADA'],
    ['REJEITADA', 'APROVADA'],
    ['APROVADA', 'APROVADA'],
  ])('preserva %s e descarta veredito %s que chegou depois', async (atual, recebido) => {
    const contexto = montar();
    contexto.transacoes.travarPorExternalId.mockResolvedValue({ id: ID_INTERNO, status: atual });

    await contexto.consumer.processar(evento(recebido));

    expect(contexto.transacoes.atualizarStatus).not.toHaveBeenCalled();
  });

  it('nao lanca erro, para o offset ser confirmado e a particao seguir', async () => {
    const contexto = montar();
    contexto.transacoes.travarPorExternalId.mockResolvedValue({
      id: ID_INTERNO,
      status: 'APROVADA',
    });

    await expect(contexto.consumer.processar(evento('REJEITADA'))).resolves.toBeUndefined();
  });
});

describe('transacao inexistente', () => {
  it('lanca erro definitivo, para a mensagem ir para a DLQ e nao travar a particao', async () => {
    const contexto = montar();
    contexto.transacoes.travarPorExternalId.mockResolvedValue(null);

    await expect(contexto.consumer.processar(evento())).rejects.toThrow(ErroDefinitivo);
  });
});

describe('falha transitoria', () => {
  it('propaga o erro para o runner decidir, sem confirmar o offset', async () => {
    const contexto = montar();
    contexto.transacoes.atualizarStatus.mockRejectedValue(new Error('banco fora'));

    await expect(contexto.consumer.processar(evento())).rejects.toThrow('banco fora');
  });
});
