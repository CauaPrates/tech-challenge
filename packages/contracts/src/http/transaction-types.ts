import { z } from 'zod';
/**
 * O front deixava os tipos chumbados; eles vivem numa tabela e agora vêm da API. O nome segue o
 * campo do contrato de criação (`transferTypeId`), e não o do modelo do banco, para não colidir
 * com o tipo gerado pelo Prisma.
 */
export const transferTypeSchema = z.object({
  id: z.int().positive(),
  name: z.string().min(1),
});
export const transferTypesSchema = z.array(transferTypeSchema);
export type TransferType = z.infer<typeof transferTypeSchema>;
/**
 * Contagem por status para o topo do dashboard. Um GROUP BY no banco em vez de três requisições
 * de listagem com `pageSize=1` só para ler o total de cada uma.
 */
export const transactionsSummarySchema = z.object({
  total: z.int().nonnegative(),
  porStatus: z.object({
    pendente: z.int().nonnegative(),
    aprovada: z.int().nonnegative(),
    rejeitada: z.int().nonnegative(),
  }),
});
export type TransactionsSummary = z.infer<typeof transactionsSummarySchema>;
