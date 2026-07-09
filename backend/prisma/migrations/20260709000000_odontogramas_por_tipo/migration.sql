-- CreateEnum
CREATE TYPE "TipoOdontograma" AS ENUM ('GENERAL_ADULTO', 'GENERAL_INFANTIL', 'ORTODONCIA');

-- AlterTable
ALTER TABLE "HcOdontograma"
ADD COLUMN "tipo" "TipoOdontograma" NOT NULL DEFAULT 'GENERAL_ADULTO',
ADD COLUMN "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "HcOdontograma_historia_id_tipo_idx" ON "HcOdontograma"("historia_id", "tipo");
