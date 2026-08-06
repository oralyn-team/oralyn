-- AlterTable
ALTER TABLE "CertificadoDental" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anulado_en" TIMESTAMP(3),
ADD COLUMN     "motivo_anulacion" TEXT;

-- AlterTable
ALTER TABLE "Consentimiento" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anulado_en" TIMESTAMP(3),
ADD COLUMN     "motivo_anulacion" TEXT;
