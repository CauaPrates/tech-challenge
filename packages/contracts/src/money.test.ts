import { describe, expect, it } from 'vitest';

import { decimalStringSchema, monetaryNumberSchema } from './money';

describe('decimalStringSchema', () => {
  it.each(['120', '120.5', '120.00', '1000.01', '0.01'])('aceita %s', (valor) => {
    expect(decimalStringSchema.safeParse(valor).success).toBe(true);
  });

  it.each(['0', '0.00', '-1', '120.555', '1e3', '', ' 120', 'abc', '.5'])('recusa %s', (valor) => {
    expect(decimalStringSchema.safeParse(valor).success).toBe(false);
  });

  it('recusa number, porque valor monetario em transito e string', () => {
    expect(decimalStringSchema.safeParse(120).success).toBe(false);
  });
});

describe('monetaryNumberSchema', () => {
  it.each([120, 1000, 1000.01, 0.01])('aceita %s', (valor) => {
    expect(monetaryNumberSchema.safeParse(valor).success).toBe(true);
  });

  it.each([0, -1, 120.555])('recusa %s', (valor) => {
    expect(monetaryNumberSchema.safeParse(valor).success).toBe(false);
  });

  it('recusa string, porque na borda HTTP o contrato usa number', () => {
    expect(monetaryNumberSchema.safeParse('120').success).toBe(false);
  });
});
