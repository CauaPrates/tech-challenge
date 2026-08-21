-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "transaction_type" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "transaction_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL,
    "external_id" UUID NOT NULL,
    "account_external_id_debit" UUID NOT NULL,
    "account_external_id_credit" UUID NOT NULL,
    "type_id" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDENTE',
    "value" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_type_name_key" ON "transaction_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_external_id_key" ON "transaction"("external_id");

-- CreateIndex
CREATE INDEX "transaction_status_created_at_idx" ON "transaction"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transaction_type_id_created_at_idx" ON "transaction"("type_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transaction_created_at_idx" ON "transaction"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "transaction_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
