-- Sprint 1: status void + idempotency WA messageId
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'VOIDED');

ALTER TABLE "Transaction" ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Transaction" ADD COLUMN "messageId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "voidedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Transaction_messageId_key" ON "Transaction"("messageId");
CREATE INDEX "Transaction_userId_status_date_idx" ON "Transaction"("userId", "status", "date");
