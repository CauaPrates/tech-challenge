import { deadLetterTopic, TOPICS } from '@challenge/contracts';
import type { EachMessagePayload } from 'kafkajs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ErroDefinitivo } from './erros';
import { type HandlerDeEvento, KafkaConsumerRunner } from './kafka-consumer';
import type { KafkaProducer } from './kafka-producer';
import type { KafkaOpcoes } from './opcoes';

const OPCOES: KafkaOpcoes = {
  clientId: 'teste',
  brokers: ['localhost:9092'],
  maxTentativas: 3,
  backoffBaseMs: 1,
  backoffMaxMs: 2,
  reconexaoMs: 1,
};

const schema = z.object({ eventId: z.uuid(), payload: z.object({ valor: z.number() }) });
type Evento = z.infer<typeof schema>;

const EVENTO_VALIDO = {
  eventId: 'b3b1e2c4-1111-4222-8333-444455556666',
  payload: { valor: 10 },
};

function mensagem(corpo: unknown, offset = '42'): EachMessagePayload {
  return {
    topic: TOPICS.transactionCreated,
    partition: 2,
    message: {
      key: null,
      value: corpo === undefined ? null : Buffer.from(JSON.stringify(corpo), 'utf8'),
      offset,
      timestamp: '0',
      attributes: 0,
      headers: {},
    },
  } as unknown as EachMessagePayload;
}

function montar(processar: HandlerDeEvento<Evento>['processar']) {
  const producer = { publicar: vi.fn<(t: string, k: string, v: unknown) => Promise<void>>() };
  const runner = new KafkaConsumerRunner(OPCOES, producer as unknown as KafkaProducer);

  const handler: HandlerDeEvento<Evento> = {
    topico: TOPICS.transactionCreated,
    grupo: 'grupo-de-teste',
    schema,
    processar,
  };

  // processarMensagem e privado por design: o teste exercita o comportamento por esta ponte, e
  // nao reimplementa a decisao de confirmar ou nao o offset
  const processarMensagem = (payload: EachMessagePayload): Promise<void> =>
    (
      runner as unknown as {
        processarMensagem: (h: HandlerDeEvento<Evento>, p: EachMessagePayload) => Promise<void>;
      }
    ).processarMensagem(handler, payload);

  return { processarMensagem, producer };
}

describe('mensagem valida', () => {
  it('processa e nao toca na DLQ', async () => {
    const processar = vi.fn<(e: Evento) => Promise<void>>().mockResolvedValue(undefined);
    const { processarMensagem, producer } = montar(processar);

    await processarMensagem(mensagem(EVENTO_VALIDO));

    expect(processar).toHaveBeenCalledWith(EVENTO_VALIDO);
    expect(producer.publicar).not.toHaveBeenCalled();
  });
});

describe('payload invalido', () => {
  let contexto: ReturnType<typeof montar>;
  let processar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    processar = vi.fn().mockResolvedValue(undefined);
    contexto = montar(processar as HandlerDeEvento<Evento>['processar']);
  });

  it('vai direto para a DLQ sem chamar o handler', async () => {
    await contexto.processarMensagem(mensagem({ eventId: 'nao-e-uuid' }));

    expect(processar).not.toHaveBeenCalled();
    expect(contexto.producer.publicar).toHaveBeenCalledOnce();
    expect(contexto.producer.publicar.mock.calls[0]?.[0]).toBe(
      deadLetterTopic(TOPICS.transactionCreated),
    );
  });

  it('preserva o corpo original na DLQ, para reprocessar ser possivel', async () => {
    await contexto.processarMensagem(mensagem({ eventId: 'nao-e-uuid' }));

    const enviado = contexto.producer.publicar.mock.calls[0]?.[2] as { original?: string };
    expect(enviado.original).toContain('nao-e-uuid');
  });

  it('trata mensagem sem corpo como definitiva', async () => {
    await contexto.processarMensagem(mensagem(undefined));

    expect(contexto.producer.publicar).toHaveBeenCalledOnce();
  });
});

describe('falha definitiva do handler', () => {
  it('vai para a DLQ na primeira ocorrencia, sem retentar', async () => {
    const processar = vi
      .fn<(e: Evento) => Promise<void>>()
      .mockRejectedValue(new ErroDefinitivo('transacao nao existe'));
    const { processarMensagem, producer } = montar(processar);

    await processarMensagem(mensagem(EVENTO_VALIDO));

    expect(processar).toHaveBeenCalledOnce();
    expect(producer.publicar).toHaveBeenCalledOnce();
    const enviado = producer.publicar.mock.calls[0]?.[2] as {
      error?: { name?: string };
      attempts?: number;
    };
    expect(enviado.error?.name).toBe('ErroDefinitivo');
    expect(enviado.attempts).toBe(1);
  });
});

describe('falha transitoria', () => {
  it('retenta e segue em frente quando a tentativa seguinte funciona', async () => {
    const processar = vi
      .fn<(e: Evento) => Promise<void>>()
      .mockRejectedValueOnce(new Error('banco fora'))
      .mockResolvedValueOnce(undefined);
    const { processarMensagem, producer } = montar(processar);

    await processarMensagem(mensagem(EVENTO_VALIDO));

    expect(processar).toHaveBeenCalledTimes(2);
    expect(producer.publicar).not.toHaveBeenCalled();
  });

  it('relanca sem confirmar o offset quando nao cede, em vez de descartar na DLQ', async () => {
    const processar = vi
      .fn<(e: Evento) => Promise<void>>()
      .mockRejectedValue(new Error('banco fora'));
    const { processarMensagem, producer } = montar(processar);

    await expect(processarMensagem(mensagem(EVENTO_VALIDO))).rejects.toThrow('banco fora');
    expect(processar).toHaveBeenCalledTimes(OPCOES.maxTentativas);
    expect(producer.publicar).not.toHaveBeenCalled();
  });
});
