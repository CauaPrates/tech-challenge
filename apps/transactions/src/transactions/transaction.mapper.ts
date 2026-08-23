import {
  STATUS_NAME,
  type TransactionDetail,
  type TransactionResponse,
} from '@challenge/contracts';

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

/**
 * O detalhe acrescenta campos ao contrato de leitura sem remover nenhum. updatedAt e o que
 * evidencia que o status mudou depois da criacao, fora do ciclo da requisicao.
 */
export function paraContratoDeDetalhe(transacao: TransacaoComTipo): TransactionDetail {
  return {
    ...paraContratoDeLeitura(transacao),
    accountExternalIdDebit: transacao.accountExternalIdDebit,
    accountExternalIdCredit: transacao.accountExternalIdCredit,
    updatedAt: transacao.updatedAt.toISOString(),
  };
}
