-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "taxIdNumber" TEXT,
ADD COLUMN     "taxIdType" TEXT;

-- CreateTable
CREATE TABLE "ArcaAuthTicket" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sign" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcaAuthTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "tipoComprobante" INTEGER NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "numero" INTEGER,
    "receptorDocTipo" INTEGER NOT NULL,
    "receptorDocNro" TEXT NOT NULL,
    "importeTotalArs" INTEGER NOT NULL,
    "cae" TEXT,
    "caeVencimiento" TIMESTAMP(3),
    "errorMessage" TEXT,
    "rawResponse" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArcaAuthTicket_service_key" ON "ArcaAuthTicket"("service");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

