import { statusUpdatedEventId, TOPICS, type TransactionCreatedEvent } from '@challenge/contracts';
import type { KafkaConsumerRunner, KafkaProducer } from '@challenge/messaging';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionCreatedConsumer } from './transaction-created.consumer';

const EXTERNAL_ID = '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33';

function evento(value: string): TransactionCreatedEvent {
  return {
    eventId: 'b3b1e2c4-1111-4222-8333-444455556666',
    eventName: TOPICS.transactionCreated,
    eventVersion: 1,
    occurredAt: '2026-08-21T13:00:00.000Z',
    payload: { transactionExternalId: EXTERNAL_ID, transferTypeId: 1, value },
  };
}

interface Publicado {
  eventId: string;
  eventName: string;
  eventVersion: number;
  payload: { transactionExternalId: string; status: string; reason: string };
}

function montar() {
  const producer = { publicar: vi.fn<(t: string, k: string, v: unknown) => Promise<void>>() };
  const runner = { registrar: vi.fn() };
  const config = { get: vi.fn(() => 'anti-fraud-consumer') };

  const consumer = new TransactionCreatedConsumer(
    config as unknown as ConstructorParameters<typeof TransactionCreatedConsumer>[0],
    runner as unknown as KafkaConsumerRunner,
    producer as unknown as KafkaProducer,
  );

  const publicado = (): Publicado => producer.publicar.mock.calls[0]?.[2] as Publicado;

  return { consumer, producer, runner, publicado };
}

describe('avaliacao', () => {
  let contexto: ReturnType<typeof montar>;

  beforeEach(() => {
    contexto = montar();
  });

  it('aprova valor dentro do limite', async () => {
    await contexto.consumer.processar(evento('120.00'));

    expect(contexto.publicado().payload.status).toBe('APROVADA');
  });

  it('rejeita valor acima do limite', async () => {
    await contexto.consumer.processar(evento('1500.00'));

    expect(contexto.publicado().payload.status).toBe('REJEITADA');
  });

  it('aprova exatamente 1000, porque o enunciado diz "acima de 1000"', async () => {
    await contexto.consumer.processar(evento('1000.00'));

    expect(contexto.publicado().payload.status).toBe('APROVADA');
  });

  it('rejeita 1000.01: um centavo acima ja e acima', async () => {
    await contexto.consumer.processar(evento('1000.01'));

    expect(contexto.publicado().payload.status).toBe('REJEITADA');
  });

  it('publica no topico de status com a transacao como chave de particao', async () => {
    await contexto.consumer.processar(evento('120.00'));

    expect(contexto.producer.publicar).toHaveBeenCalledWith(
      TOPICS.transactionStatusUpdated,
      EXTERNAL_ID,
      expect.anything(),
    );
  });

  it('acompanha o veredito de uma justificativa', async () => {
    await contexto.consumer.processar(evento('1500.00'));

    expect(contexto.publicado().payload.reason).toMatch(/acima do limite/);
  });
});

describe('eventId deterministico', () => {
  it('deriva o eventId da transacao avaliada, nao sorteia', async () => {
    const contexto = montar();

    await contexto.consumer.processar(evento('120.00'));

    expect(contexto.publicado().eventId).toBe(statusUpdatedEventId(EXTERNAL_ID));
  });

  it('reprocessar a mesma entrada produz o mesmo eventId, o que dispensa banco aqui', async () => {
    const primeiro = montar();
    const segundo = montar();

    await primeiro.consumer.processar(evento('120.00'));
    await segundo.consumer.processar(evento('120.00'));

    expect(primeiro.publicado().eventId).toBe(segundo.publicado().eventId);
  });

  it('nao reaproveita o eventId do evento de entrada', async () => {
    const contexto = montar();
    const entrada = evento('120.00');

    await contexto.consumer.processar(entrada);

    expect(contexto.publicado().eventId).not.toBe(entrada.eventId);
  });
});

describe('propagacao de falha', () => {
  it('deixa falha de publicacao subir, para o runner decidir retentar', async () => {
    const contexto = montar();
    contexto.producer.publicar.mockRejectedValue(new Error('broker fora'));

    await expect(contexto.consumer.processar(evento('120.00'))).rejects.toThrow('broker fora');
  });
});
