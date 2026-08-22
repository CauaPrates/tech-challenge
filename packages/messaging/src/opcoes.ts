export const KAFKA_OPCOES = Symbol('KAFKA_OPCOES');

export interface KafkaOpcoes {
  clientId: string;
  brokers: string[];
  /** Tentativas de processamento de uma mesma mensagem antes de desistir do lote. */
  maxTentativas: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  /** Espera entre tentativas de conectar quando o broker esta indisponivel na subida. */
  reconexaoMs: number;
}

export const OPCOES_PADRAO = {
  maxTentativas: 3,
  backoffBaseMs: 200,
  backoffMaxMs: 5000,
  reconexaoMs: 5000,
} as const;
