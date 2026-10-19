-- CreateEnum
CREATE TYPE "Horario" AS ENUM ('MADRUGADOR', 'NOCTURNO', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "NivelOrden" AS ENUM ('RELAJADO', 'NORMAL', 'MUY_ORDENADO');

-- CreateEnum
CREATE TYPE "Sociabilidad" AS ENUM ('CASERO', 'EQUILIBRADO', 'SOCIAL');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('LIKE', 'PASS');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "amoblado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "banos" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "barrio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '🏠',
ADD COLUMN     "habitaciones" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "servicios" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT NOT NULL DEFAULT '🙂',
ADD COLUMN     "bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ciudad" TEXT NOT NULL DEFAULT 'Tunja',
ADD COLUMN     "edad" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "fumador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "horario" "Horario" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN     "intereses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mascotas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocupacion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "orden" "NivelOrden" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "presupuesto" INTEGER NOT NULL DEFAULT 600000,
ADD COLUMN     "sociabilidad" "Sociabilidad" NOT NULL DEFAULT 'EQUILIBRADO';

-- CreateTable
CREATE TABLE "swipes" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "objetivoId" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "usuarioAId" TEXT NOT NULL,
    "usuarioBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "swipes_autorId_objetivoId_key" ON "swipes"("autorId", "objetivoId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_usuarioAId_usuarioBId_key" ON "matches"("usuarioAId", "usuarioBId");

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_usuarioAId_fkey" FOREIGN KEY ("usuarioAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_usuarioBId_fkey" FOREIGN KEY ("usuarioBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

