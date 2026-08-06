/*
  Warnings:

  - A unique constraint covering the columns `[historia_id,tipo]` on the table `HcOdontograma` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "HcOdontograma_historia_id_tipo_idx";

-- CreateIndex
CREATE UNIQUE INDEX "HcOdontograma_historia_id_tipo_key" ON "HcOdontograma"("historia_id", "tipo");
