-- AlterTable
ALTER TABLE "outbox_message" ADD COLUMN     "next_attempt_at" TIMESTAMPTZ(3);

-- O indice parcial passa a cobrir tambem o recuo: o dispatcher busca por elegibilidade, nao
-- so por "nao publicada". Sem next_attempt_at no indice, cada varredura leria mensagens que
-- ainda estao em espera.
DROP INDEX IF EXISTS "outbox_message_pendentes_idx";

CREATE INDEX "outbox_message_pendentes_idx"
  ON "outbox_message" ("next_attempt_at" NULLS FIRST, "occurred_at")
  WHERE "published_at" IS NULL;
