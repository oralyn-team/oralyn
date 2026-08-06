/*
  Warnings:

  - You are about to drop the column `nit` on the `Usuario` table. All the data in the column will be lost.
  - Added the required column `consultorio_id` to the `CertificadoDental` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultorio_id` to the `Cita` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultorio_id` to the `Consentimiento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultorio_id` to the `Cotizacion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultorio_id` to the `Paciente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultorio_id` to the `Pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultorio_id` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CertificadoDental" ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Consentimiento" ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "nit",
ADD COLUMN     "consultorio_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "nombre_consultorio" TEXT NOT NULL,
    "nombre_profesional" TEXT NOT NULL,
    "registro_profesional" TEXT,
    "nit" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Villavicencio',
    "email" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificadoDental_consultorio_id_idx" ON "CertificadoDental"("consultorio_id");

-- CreateIndex
CREATE INDEX "Cita_consultorio_id_idx" ON "Cita"("consultorio_id");

-- CreateIndex
CREATE INDEX "Consentimiento_consultorio_id_idx" ON "Consentimiento"("consultorio_id");

-- CreateIndex
CREATE INDEX "Cotizacion_consultorio_id_idx" ON "Cotizacion"("consultorio_id");

-- CreateIndex
CREATE INDEX "Paciente_consultorio_id_idx" ON "Paciente"("consultorio_id");

-- CreateIndex
CREATE INDEX "Paciente_numero_documento_idx" ON "Paciente"("numero_documento");

-- CreateIndex
CREATE INDEX "Pago_consultorio_id_idx" ON "Pago"("consultorio_id");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoDental" ADD CONSTRAINT "CertificadoDental_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
