-- AlterTable
ALTER TABLE "DeliveryFile" ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "FileBlob" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileBlob_pkey" PRIMARY KEY ("key")
);

