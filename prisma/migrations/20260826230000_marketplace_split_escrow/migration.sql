-- CreateEnum
CREATE TYPE "ConnectedAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "mpPreferenceId",
DROP COLUMN "paidAt",
ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "captureAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "captureDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "idempotencyKeyCapture" TEXT,
ADD COLUMN     "idempotencyKeyCreate" TEXT NOT NULL,
ADD COLUMN     "lastPaymentError" TEXT,
ADD COLUMN     "payerDocNumber" TEXT,
ADD COLUMN     "payerDocType" TEXT,
ADD COLUMN     "payerEmail" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "mercadoPagoUserId";

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mpUserId" INTEGER,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "publicKey" TEXT,
    "scope" TEXT,
    "liveMode" BOOLEAN NOT NULL DEFAULT false,
    "status" "ConnectedAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_key" ON "ConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKeyCreate_key" ON "Order"("idempotencyKeyCreate");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKeyCapture_key" ON "Order"("idempotencyKeyCapture");

-- CreateIndex
CREATE INDEX "Order_status_releaseDueAt_idx" ON "Order"("status", "releaseDueAt");

-- CreateIndex
CREATE INDEX "Order_status_captureDeadlineAt_idx" ON "Order"("status", "captureDeadlineAt");

-- CreateIndex
CREATE INDEX "Order_mpPaymentId_idx" ON "Order"("mpPaymentId");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

