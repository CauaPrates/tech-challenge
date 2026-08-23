import { describe, expect, it } from 'vitest';

import { validateEnv } from './env';

const ambienteMinimo = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/challenge?schema=public',
  KAFKA_BROKERS: 'localhost:9092',
};

describe('validateEnv', () => {
  it('aceita o ambiente minimo e aplica os padroes', () => {
    const env = validateEnv({ ...ambienteMinimo });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      TRANSACTIONS_PORT: 3001,
      KAFKA_CLIENT_ID: 'tech-challenge',
      KAFKA_GROUP_ID_TRANSACTIONS: 'transactions-consumer',
    });
  });

  it('converte a porta, que chega do ambiente sempre como texto', () => {
    const env = validateEnv({ ...ambienteMinimo, TRANSACTIONS_PORT: '3005' });

    expect(env.TRANSACTIONS_PORT).toBe(3005);
  });

  it('quebra a lista de brokers em array, que e o formato que o kafkajs espera', () => {
    const env = validateEnv({ ...ambienteMinimo, KAFKA_BROKERS: 'a:9092, b:9093 ,c:9094' });

    expect(env.KAFKA_BROKERS).toEqual(['a:9092', 'b:9093', 'c:9094']);
  });

  it.each(['DATABASE_URL', 'KAFKA_BROKERS'])('falha quando falta %s', (variavel) => {
    const incompleto: Record<string, unknown> = { ...ambienteMinimo };
    delete incompleto[variavel];

    expect(() => validateEnv(incompleto)).toThrow(/Configuracao de ambiente invalida/);
  });

  it('nomeia a variavel culpada na mensagem, para o erro ser acionavel', () => {
    expect(() => validateEnv({ ...ambienteMinimo, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it.each(['0', '-1', 'abc'])('recusa porta invalida %s', (porta) => {
    expect(() => validateEnv({ ...ambienteMinimo, TRANSACTIONS_PORT: porta })).toThrow();
  });

  it('recusa NODE_ENV fora do conjunto conhecido', () => {
    expect(() => validateEnv({ ...ambienteMinimo, NODE_ENV: 'staging' })).toThrow();
  });

  it('descarta variavel que nao esta no schema, para configuracao ser explicita', () => {
    const env = validateEnv({ ...ambienteMinimo, VARIAVEL_INVENTADA: 'x' });

    expect(env).not.toHaveProperty('VARIAVEL_INVENTADA');
  });
});

describe('CORS', () => {
  it('permite o dashboard local por padrao', () => {
    expect(validateEnv({ ...ambienteMinimo }).CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('aceita lista de origens separada por virgula', () => {
    const env = validateEnv({
      ...ambienteMinimo,
      CORS_ORIGINS: 'http://localhost:3000, https://painel.exemplo.com',
    });

    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://painel.exemplo.com']);
  });
});
