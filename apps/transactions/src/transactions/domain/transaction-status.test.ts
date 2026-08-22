import type { FinalTransactionStatus, TransactionStatus } from '@challenge/contracts';
import { describe, expect, it } from 'vitest';

import { ehEstadoFinal, podeTransicionar } from './transaction-status';

describe('podeTransicionar', () => {
  it.each<FinalTransactionStatus>(['APROVADA', 'REJEITADA'])(
    'permite sair de PENDENTE para %s',
    (destino) => {
      expect(podeTransicionar('PENDENTE', destino)).toBe(true);
    },
  );

  it.each<[TransactionStatus, FinalTransactionStatus]>([
    ['APROVADA', 'REJEITADA'],
    ['REJEITADA', 'APROVADA'],
    ['APROVADA', 'APROVADA'],
    ['REJEITADA', 'REJEITADA'],
  ])('recusa ir de %s para %s, porque estado final nao muda', (atual, proximo) => {
    expect(podeTransicionar(atual, proximo)).toBe(false);
  });
});

describe('ehEstadoFinal', () => {
  it('PENDENTE nao e final', () => {
    expect(ehEstadoFinal('PENDENTE')).toBe(false);
  });

  it.each<TransactionStatus>(['APROVADA', 'REJEITADA'])('%s e final', (status) => {
    expect(ehEstadoFinal(status)).toBe(true);
  });
});
