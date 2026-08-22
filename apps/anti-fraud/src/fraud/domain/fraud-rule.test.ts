import { describe, expect, it } from 'vitest';

import { avaliar, centavosDe } from './fraud-rule';

describe('centavosDe', () => {
  it.each([
    ['1000', 100_000n],
    ['1000.00', 100_000n],
    ['1000.01', 100_001n],
    ['999.99', 99_999n],
    ['0.01', 1n],
    ['0.1', 10n],
    ['120.5', 12_050n],
  ])('converte %s em %i centavos', (entrada, esperado) => {
    expect(centavosDe(entrada)).toBe(esperado);
  });

  it('nao perde precisao em valor que quebraria em ponto flutuante', () => {
    // 0.1 + 0.2 !== 0.3 em float; em centavos inteiros a soma fecha
    expect(centavosDe('0.1') + centavosDe('0.2')).toBe(centavosDe('0.3'));
  });

  it('aguenta valor grande sem estourar precisao', () => {
    expect(centavosDe('9007199254740993.99')).toBe(900_719_925_474_099_399n);
  });
});

describe('avaliar', () => {
  it.each(['0.01', '1', '120', '999.99', '1000', '1000.00'])('aprova %s', (valor) => {
    expect(avaliar(valor).status).toBe('APROVADA');
  });

  it.each(['1000.01', '1001', '1500', '99999.99'])('rejeita %s', (valor) => {
    expect(avaliar(valor).status).toBe('REJEITADA');
  });

  it('1000 aprova e 1000.01 rejeita: o limite do enunciado e inclusivo', () => {
    expect(avaliar('1000').status).toBe('APROVADA');
    expect(avaliar('1000.01').status).toBe('REJEITADA');
  });

  it('explica o veredito, para a decisao ser auditavel de quem recebe', () => {
    expect(avaliar('1500').reason).toMatch(/acima do limite/);
    expect(avaliar('120').reason).toMatch(/dentro do limite/);
  });

  it('e deterministico: mesmo valor, mesmo veredito', () => {
    expect(avaliar('1500')).toEqual(avaliar('1500'));
  });
});
