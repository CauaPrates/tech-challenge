import { describe, expect, it } from 'vitest';

import { transactionCreatedSchema } from './transaction-created';
import { transactionStatusUpdatedSchema } from './transaction-status-updated';

const criado = {
  eventId: 'b3b1e2c4-1111-4222-8333-444455556666',
  eventName: 'transaction.created',
  eventVersion: 1,
  occurredAt: '2026-08-21T13:00:00.000Z',
  payload: {
    transactionExternalId: '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33',
    transferTypeId: 1,
    value: '120.00',
  },
};

const atualizado = {
  eventId: 'e7d2f9a1-1111-4222-8333-444455556666',
  eventName: 'transaction.status.updated',
  eventVersion: 1,
  occurredAt: '2026-08-21T13:00:02.180Z',
  payload: {
    transactionExternalId: '9c1e8b4a-7f21-4c3e-9a55-2b7d4e1f0a33',
    status: 'APROVADA',
    reason: 'valor dentro do limite permitido',
  },
};

describe('transaction.created', () => {
  it('aceita o envelope completo', () => {
    expect(transactionCreatedSchema.safeParse(criado).success).toBe(true);
  });

  it('recusa eventName divergente, que e o que impede consumir o topico errado', () => {
    const resultado = transactionCreatedSchema.safeParse({
      ...criado,
      eventName: 'transaction.status.updated',
    });

    expect(resultado.success).toBe(false);
  });

  it('recusa value como number', () => {
    const resultado = transactionCreatedSchema.safeParse({
      ...criado,
      payload: { ...criado.payload, value: 120 },
    });

    expect(resultado.success).toBe(false);
  });

  it.each(['eventId', 'occurredAt', 'eventVersion'])('recusa envelope sem %s', (campo) => {
    const incompleto: Record<string, unknown> = { ...criado };
    delete incompleto[campo];

    expect(transactionCreatedSchema.safeParse(incompleto).success).toBe(false);
  });
});

describe('transaction.status.updated', () => {
  it('aceita o envelope completo', () => {
    expect(transactionStatusUpdatedSchema.safeParse(atualizado).success).toBe(true);
  });

  it('recusa PENDENTE, porque o anti-fraud so publica estado final', () => {
    const resultado = transactionStatusUpdatedSchema.safeParse({
      ...atualizado,
      payload: { ...atualizado.payload, status: 'PENDENTE' },
    });

    expect(resultado.success).toBe(false);
  });

  it('recusa reason vazio, para o veredito nunca chegar sem justificativa', () => {
    const resultado = transactionStatusUpdatedSchema.safeParse({
      ...atualizado,
      payload: { ...atualizado.payload, reason: '' },
    });

    expect(resultado.success).toBe(false);
  });
});
