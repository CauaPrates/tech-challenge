import { TOPICS } from '@challenge/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../config/env';
import type { KafkaProducer } from '../messaging/kafka-producer';
import { OutboxDispatcher } from './outbox.dispatcher';
import type { MensagemPendente, OutboxRepository } from './outbox.repository';

const AGGREGATE_ID = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';
const OCORREU_EM = new Date('2026-08-21T13:00:00.000Z');
const ID_MENSAGEM = '22222222-2222-4222-8222-222222222222';

function pendente(sobrescreve: Partial<MensagemPendente> = {}): MensagemPendente {
  return {
    id: ID_MENSAGEM,
    eventId: 'b3b1e2c4-1111-4222-8333-444455556666',
    eventName: TOPICS.transactionCreated,
    aggregateId: AGGREGATE_ID,
    payload: { transactionExternalId: AGGREGATE_ID, transferTypeId: 1, value: '120.00' },
    occurredAt: OCORREU_EM,
    attempts: 0,
    ...sobrescreve,
  };
}

type ChavesUsadas =
  | 'OUTBOX_BATCH_SIZE'
  | 'OUTBOX_MAX_ATTEMPTS'
  | 'OUTBOX_POLL_INTERVAL_MS'
  | 'OUTBOX_LEASE_MS'
  | 'OUTBOX_BACKOFF_BASE_MS'
  | 'OUTBOX_BACKOFF_MAX_MS';

const CONFIGURACAO: Pick<Env, ChavesUsadas> = {
  OUTBOX_BATCH_SIZE: 50,
  OUTBOX_MAX_ATTEMPTS: 10,
  OUTBOX_POLL_INTERVAL_MS: 1000,
  OUTBOX_LEASE_MS: 30_000,
  OUTBOX_BACKOFF_BASE_MS: 1000,
  OUTBOX_BACKOFF_MAX_MS: 60_000,
};

function montar() {
  const outbox = {
    reivindicarLote: vi
      .fn<(limite: number, max: number, lease: number) => Promise<MensagemPendente[]>>()
      .mockResolvedValue([]),
    marcarPublicada: vi.fn<(id: string) => Promise<void>>(),
    registrarFalha: vi.fn<(id: string, erro: string, proxima: Date) => Promise<void>>(),
    enfileirar: vi.fn(),
    contarPendentes: vi.fn(),
  };

  const producer = { publicar: vi.fn<(t: string, k: string, v: unknown) => Promise<void>>() };

  const config = {
    get: vi.fn((chave: ChavesUsadas) => CONFIGURACAO[chave]),
  };

  const dispatcher = new OutboxDispatcher(
    config as unknown as ConstructorParameters<typeof OutboxDispatcher>[0],
    outbox as unknown as OutboxRepository,
    producer as unknown as KafkaProducer,
  );

  return { dispatcher, outbox, producer, config };
}

describe('despacharLote', () => {
  let contexto: ReturnType<typeof montar>;

  beforeEach(() => {
    contexto = montar();
  });

  it('nao publica nada quando nao ha pendente elegivel', async () => {
    const despachadas = await contexto.dispatcher.despacharLote();

    expect(despachadas).toBe(0);
    expect(contexto.producer.publicar).not.toHaveBeenCalled();
  });

  it('publica o envelope completo e marca a mensagem como publicada', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([pendente()]);

    const despachadas = await contexto.dispatcher.despacharLote();

    expect(despachadas).toBe(1);
    expect(contexto.producer.publicar).toHaveBeenCalledWith(
      TOPICS.transactionCreated,
      AGGREGATE_ID,
      {
        eventId: 'b3b1e2c4-1111-4222-8333-444455556666',
        eventName: TOPICS.transactionCreated,
        eventVersion: 1,
        occurredAt: '2026-08-21T13:00:00.000Z',
        payload: { transactionExternalId: AGGREGATE_ID, transferTypeId: 1, value: '120.00' },
      },
    );
    expect(contexto.outbox.marcarPublicada).toHaveBeenCalledWith(ID_MENSAGEM);
    expect(contexto.outbox.registrarFalha).not.toHaveBeenCalled();
  });

  it('reivindica antes de publicar, nunca o contrario', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([pendente()]);

    await contexto.dispatcher.despacharLote();

    expect(contexto.outbox.reivindicarLote.mock.invocationCallOrder[0]).toBeLessThan(
      contexto.producer.publicar.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it('usa a chave de particao igual ao identificador da transacao', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([pendente()]);

    await contexto.dispatcher.despacharLote();

    expect(contexto.producer.publicar.mock.calls[0]?.[1]).toBe(AGGREGATE_ID);
  });

  it('registra falha com recuo e nao marca como publicada quando o broker recusa', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([pendente({ attempts: 2 })]);
    contexto.producer.publicar.mockRejectedValue(new Error('broker fora do ar'));

    await contexto.dispatcher.despacharLote();

    expect(contexto.outbox.marcarPublicada).not.toHaveBeenCalled();
    const [id, motivo, proxima] = contexto.outbox.registrarFalha.mock.calls[0] ?? [];
    expect(id).toBe(ID_MENSAGEM);
    expect(motivo).toBe('broker fora do ar');
    // 2 tentativas ja feitas -> 4s de recuo
    expect(proxima).toBeInstanceOf(Date);
    expect((proxima as Date).getTime() - Date.now()).toBeGreaterThan(3000);
  });

  it('nao deixa envelope malformado chegar no topico', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([
      pendente({ payload: { transactionExternalId: AGGREGATE_ID, transferTypeId: 1, value: 120 } }),
    ]);

    await contexto.dispatcher.despacharLote();

    expect(contexto.producer.publicar).not.toHaveBeenCalled();
    expect(contexto.outbox.registrarFalha).toHaveBeenCalledOnce();
  });

  it('registra falha para evento sem schema conhecido, em vez de publicar as cegas', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([
      pendente({ eventName: 'evento.inventado' }),
    ]);

    await contexto.dispatcher.despacharLote();

    expect(contexto.producer.publicar).not.toHaveBeenCalled();
    expect(contexto.outbox.registrarFalha).toHaveBeenCalledOnce();
  });

  it('uma mensagem falhando nao impede as outras do lote', async () => {
    contexto.outbox.reivindicarLote.mockResolvedValue([
      pendente({ id: 'aaaaaaaa-1111-4111-8111-111111111111' }),
      pendente({ id: 'bbbbbbbb-2222-4222-8222-222222222222' }),
    ]);
    contexto.producer.publicar
      .mockRejectedValueOnce(new Error('falha transitoria'))
      .mockResolvedValueOnce(undefined);

    const despachadas = await contexto.dispatcher.despacharLote();

    expect(despachadas).toBe(2);
    expect(contexto.outbox.registrarFalha).toHaveBeenCalledOnce();
    expect(contexto.outbox.marcarPublicada).toHaveBeenCalledOnce();
  });

  it('reivindica respeitando lote, teto de tentativas e lease do ambiente', async () => {
    await contexto.dispatcher.despacharLote();

    expect(contexto.outbox.reivindicarLote).toHaveBeenCalledWith(50, 10, 30_000);
  });
});

describe('agendamento', () => {
  it('dispara o despacho no intervalo configurado', () => {
    vi.useFakeTimers();
    const { dispatcher, outbox } = montar();

    dispatcher.onModuleInit();
    vi.advanceTimersByTime(1000);

    expect(outbox.reivindicarLote).toHaveBeenCalledOnce();
    dispatcher.onModuleDestroy();
    vi.useRealTimers();
  });

  it('para o temporizador ao destruir o modulo', () => {
    vi.useFakeTimers();
    const { dispatcher, outbox } = montar();

    dispatcher.onModuleInit();
    dispatcher.onModuleDestroy();
    vi.advanceTimersByTime(5000);

    expect(outbox.reivindicarLote).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('nao sobrepoe despachos quando um lote demora mais que o intervalo', async () => {
    vi.useFakeTimers();
    const { dispatcher, outbox } = montar();
    let liberar: (() => void) | undefined;
    outbox.reivindicarLote.mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve([]);
        }),
    );

    dispatcher.onModuleInit();
    vi.advanceTimersByTime(3000);
    await Promise.resolve();

    expect(outbox.reivindicarLote).toHaveBeenCalledOnce();

    liberar?.();
    dispatcher.onModuleDestroy();
    vi.useRealTimers();
  });
});
