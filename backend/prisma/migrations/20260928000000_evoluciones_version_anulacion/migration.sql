-- AlterTable
ALTER TABLE "HojaEvolucion" ADD COLUMN     "anulada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anulada_en" TIMESTAMP(3),
ADD COLUMN     "anulada_por" INTEGER,
ADD COLUMN     "creado_en" TIMESTAMP(3),
ADD COLUMN     "creado_por" INTEGER,
ADD COLUMN     "motivo_anulacion" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

