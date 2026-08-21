-- CreateTable
CREATE TABLE "outbox_message" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "outbox_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_message_event_id_key" ON "outbox_message"("event_id");

-- Indice parcial, escrito a mao porque o Prisma nao expressa clausula WHERE em @@index. A
-- tabela cresce sem limite, mas o indice so cobre o que ainda nao foi publicado — entao ele
-- permanece pequeno independentemente do volume historico, e e ele que o dispatcher usa.
CREATE INDEX "outbox_message_pendentes_idx"
  ON "outbox_message" ("occurred_at")
  WHERE "published_at" IS NULL;
