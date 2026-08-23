import { listTransactionsQuerySchema } from '@challenge/contracts';
import { describe, expect, it } from 'vitest';

import { filtroDaListagem, totalDePaginas } from './listagem';

function query(entrada: Record<string, unknown>) {
  return listTransactionsQuerySchema.parse(entrada);
}

describe('filtroDaListagem', () => {
  it('nao filtra nada quando nenhum filtro e informado', () => {
    expect(filtroDaListagem(query({}))).toEqual({});
  });

  it('traduz o status do nome em minusculas para o enum do banco', () => {
    expect(filtroDaListagem(query({ status: 'aprovada' }))).toEqual({ status: 'APROVADA' });
  });

  it('filtra por tipo', () => {
    expect(filtroDaListagem(query({ transferTypeId: '2' }))).toEqual({ typeId: 2 });
  });

  it('combina os filtros em vez de um sobrescrever o outro', () => {
    const filtro = filtroDaListagem(query({ status: 'pendente', transferTypeId: '1' }));

    expect(filtro).toMatchObject({ status: 'PENDENTE', typeId: 1 });
  });

  it('inclui o dia inteiro quando o periodo chega como data sem hora', () => {
    const filtro = filtroDaListagem(query({ from: '2026-08-01', to: '2026-08-31' }));

    expect(filtro.createdAt).toEqual({
      gte: new Date('2026-08-01T00:00:00.000Z'),
      lte: new Date('2026-08-31T23:59:59.999Z'),
    });
  });

  it('respeita a hora informada quando o periodo vem completo', () => {
    const filtro = filtroDaListagem(query({ from: '2026-08-01T10:30:00.000Z' }));

    expect(filtro.createdAt).toEqual({ gte: new Date('2026-08-01T10:30:00.000Z') });
  });

  it('aceita so o inicio do periodo', () => {
    expect(filtroDaListagem(query({ from: '2026-08-01' })).createdAt).toEqual({
      gte: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('aceita so o fim do periodo', () => {
    expect(filtroDaListagem(query({ to: '2026-08-31' })).createdAt).toEqual({
      lte: new Date('2026-08-31T23:59:59.999Z'),
    });
  });
});

describe('totalDePaginas', () => {
  it.each([
    [0, 20, 0],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [137, 20, 7],
  ])('%i registros em paginas de %i dao %i paginas', (total, pageSize, esperado) => {
    expect(totalDePaginas(total, pageSize)).toBe(esperado);
  });
});
