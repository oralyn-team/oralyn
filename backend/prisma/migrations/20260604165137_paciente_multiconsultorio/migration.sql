/*
  Warnings:

  - A unique constraint covering the columns `[consultorio_id,numero_documento]` on the table `Paciente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Paciente_numero_documento_idx";

-- DropIndex
DROP INDEX "Paciente_numero_documento_key";

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_consultorio_id_numero_documento_key" ON "Paciente"("consultorio_id", "numero_documento");
