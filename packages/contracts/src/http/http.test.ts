import { describe, expect, it } from 'vitest';

import { createTransactionSchema } from './create-transaction';
import { listTransactionsQuerySchema } from './list-transactions';

const criacaoValida = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '0f8fad5b-d9cb-469f-a165-70867728950e',
  transferTypeId: 1,
  value: 120,
};

describe('createTransactionSchema', () => {
  it('aceita o payload do enunciado', () => {
    expect(createTransactionSchema.safeParse(criacaoValida).success).toBe(true);
  });

  it('aceita debito e credito iguais, porque o enunciado nao proibe', () => {
    const resultado = createTransactionSchema.safeParse({
      ...criacaoValida,
      accountExternalIdCredit: criacaoValida.accountExternalIdDebit,
    });

    expect(resultado.success).toBe(true);
  });

  it.each([0, -1, 120.555])('recusa value %s', (value) => {
    expect(createTransactionSchema.safeParse({ ...criacaoValida, value }).success).toBe(false);
  });

  it('recusa conta que nao e uuid', () => {
    const resultado = createTransactionSchema.safeParse({
      ...criacaoValida,
      accountExternalIdDebit: 'conta-1',
    });

    expect(resultado.success).toBe(false);
  });

  it.each([0, -1, 1.5])('recusa transferTypeId %s', (transferTypeId) => {
    expect(createTransactionSchema.safeParse({ ...criacaoValida, transferTypeId }).success).toBe(
      false,
    );
  });

  it('aponta o campo invalido, que e o que o formulario usa para posicionar a mensagem', () => {
    const resultado = createTransactionSchema.safeParse({ ...criacaoValida, value: 0 });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map((issue) => issue.path.join('.'))).toContain('value');
  });
});

describe('listTransactionsQuerySchema', () => {
  it('aplica os padroes de paginacao quando nada e informado', () => {
    const resultado = listTransactionsQuerySchema.parse({});

    expect(resultado).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('converte os numeros que chegam como texto na query string', () => {
    const resultado = listTransactionsQuerySchema.parse({
      page: '3',
      pageSize: '50',
      transferTypeId: '2',
    });

    expect(resultado).toMatchObject({ page: 3, pageSize: 50, transferTypeId: 2 });
  });

  it('recusa pageSize acima de 100, para ninguem pedir a tabela inteira', () => {
    expect(listTransactionsQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it.each([0, -1])('recusa page %s', (page) => {
    expect(listTransactionsQuerySchema.safeParse({ page }).success).toBe(false);
  });

  it('recusa status fora do conjunto conhecido', () => {
    expect(listTransactionsQuerySchema.safeParse({ status: 'PENDENTE' }).success).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ status: 'pendente' }).success).toBe(true);
  });

  it('aceita periodo como data ou como data e hora', () => {
    expect(listTransactionsQuerySchema.safeParse({ from: '2026-08-01' }).success).toBe(true);
    expect(
      listTransactionsQuerySchema.safeParse({ from: '2026-08-01T00:00:00.000Z' }).success,
    ).toBe(true);
  });

  it('recusa intervalo invertido', () => {
    const resultado = listTransactionsQuerySchema.safeParse({
      from: '2026-08-31',
      to: '2026-08-01',
    });

    expect(resultado.success).toBe(false);
  });

  it('recusa data mal formada', () => {
    expect(listTransactionsQuerySchema.safeParse({ from: '31/08/2026' }).success).toBe(false);
  });
});
