-- CreateEnum
CREATE TYPE "Provincia" AS ENUM ('CABA', 'BUENOS_AIRES', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CORDOBA', 'CORRIENTES', 'ENTRE_RIOS', 'FORMOSA', 'JUJUY', 'LA_PAMPA', 'LA_RIOJA', 'MENDOZA', 'MISIONES', 'NEUQUEN', 'RIO_NEGRO', 'SALTA', 'SAN_JUAN', 'SAN_LUIS', 'SANTA_CRUZ', 'SANTA_FE', 'SANTIAGO_DEL_ESTERO', 'TIERRA_DEL_FUEGO', 'TUCUMAN');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "artistName" TEXT,
ADD COLUMN     "genreId" TEXT,
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "photoContentType" TEXT,
ADD COLUMN     "photoStorageKey" TEXT,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "provincia" "Provincia",
ADD COLUMN     "subgenreId" TEXT;

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subgenre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subgenre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subgenre_genreId_name_key" ON "Subgenre"("genreId", "name");

-- CreateIndex
CREATE INDEX "Listing_provincia_idx" ON "Listing"("provincia");

-- CreateIndex
CREATE INDEX "Listing_genreId_idx" ON "Listing"("genreId");

-- CreateIndex
CREATE INDEX "Listing_eventDate_idx" ON "Listing"("eventDate");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_subgenreId_fkey" FOREIGN KEY ("subgenreId") REFERENCES "Subgenre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subgenre" ADD CONSTRAINT "Subgenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
