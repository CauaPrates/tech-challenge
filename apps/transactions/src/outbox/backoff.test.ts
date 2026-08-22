import { describe, expect, it } from 'vitest';

import { atrasoDaProximaTentativa, proximaTentativaEm } from './backoff';

const PARAMETROS = { baseMs: 1000, tetoMs: 60_000 };

describe('atrasoDaProximaTentativa', () => {
  it.each([
    [0, 1000],
    [1, 2000],
    [2, 4000],
    [3, 8000],
    [4, 16_000],
    [5, 32_000],
  ])('dobra a cada tentativa: %i tentativas feitas -> %ims', (feitas, esperado) => {
    expect(atrasoDaProximaTentativa(feitas, PARAMETROS)).toBe(esperado);
  });

  it('respeita o teto em vez de crescer sem limite', () => {
    expect(atrasoDaProximaTentativa(6, PARAMETROS)).toBe(60_000);
    expect(atrasoDaProximaTentativa(50, PARAMETROS)).toBe(60_000);
  });

  it('nao estoura com contagem absurda, que viraria Infinity sem o limite do expoente', () => {
    expect(Number.isFinite(atrasoDaProximaTentativa(5000, PARAMETROS))).toBe(true);
  });
});

describe('proximaTentativaEm', () => {
  it('soma o atraso ao instante informado', () => {
    const agora = new Date('2026-08-21T13:00:00.000Z');

    expect(proximaTentativaEm(agora, 2, PARAMETROS).toISOString()).toBe('2026-08-21T13:00:04.000Z');
  });
});
