import { STATUS_NAME, type TransactionResponse } from '@challenge/contracts';

import { decimalParaNumero } from '../common/decimal';
import type { TransacaoComTipo } from './transactions.repository';

export function paraContratoDeLeitura(transacao: TransacaoComTipo): TransactionResponse {
  return {
    transactionExternalId: transacao.externalId,
    transactionType: { name: transacao.type.name },
    transactionStatus: { name: STATUS_NAME[transacao.status] },
    value: decimalParaNumero(transacao.value),
    createdAt: transacao.createdAt.toISOString(),
  };
}
