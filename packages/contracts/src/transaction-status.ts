import { z } from 'zod';

/** Conjunto fechado, com maquina de estado. Enum, e nao tabela: status e regra, tipo e dado. */
export const transactionStatusSchema = z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

/** O anti-fraud so publica estado final. O schema recusa PENDENTE para tornar isso explicito. */
export const finalTransactionStatusSchema = z.enum(['APROVADA', 'REJEITADA']);
export type FinalTransactionStatus = z.infer<typeof finalTransactionStatusSchema>;

export const transactionStatusNameSchema = z.enum(['pendente', 'aprovada', 'rejeitada']);
export type TransactionStatusName = z.infer<typeof transactionStatusNameSchema>;

/** O contrato de leitura expoe o status como { name } em minusculas. */
export const STATUS_NAME: Record<TransactionStatus, TransactionStatusName> = {
  PENDENTE: 'pendente',
  APROVADA: 'aprovada',
  REJEITADA: 'rejeitada',
};

/** Caminho inverso: o filtro de listagem chega pelo nome em minusculas. */
export const STATUS_BY_NAME: Record<TransactionStatusName, TransactionStatus> = {
  pendente: 'PENDENTE',
  aprovada: 'APROVADA',
  rejeitada: 'REJEITADA',
};
