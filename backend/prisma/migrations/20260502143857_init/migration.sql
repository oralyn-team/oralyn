/*
  Warnings:

  - The `estado` column on the `Cita` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `estado` column on the `Cotizacion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `hora` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `paciente_id` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `edad` on the `Paciente` table. All the data in the column will be lost.
  - You are about to drop the column `paciente_id` on the `RecomendacionPostQx` table. All the data in the column will be lost.
  - Changed the type of `tipo` on the `Consentimiento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tipo_item` on the `CotizacionItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tipo_documento` on the `Paciente` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sexo` on the `Paciente` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `metodo_pago` on the `Pago` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('pendiente', 'asistio', 'no_asistio', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('borrador', 'aprobada', 'rechazada', 'pagada');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('masculino', 'femenino', 'otro');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RC', 'TI', 'CC', 'CE', 'NUIP', 'PAS');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'transferencia', 'tarjeta');

-- CreateEnum
CREATE TYPE "TipoConsentimiento" AS ENUM ('anestesia', 'cirugia_oral', 'retiro_poste_corona', 'rehabilitacion', 'higiene_oral');

-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('detartraje_curetraje', 'superficie_retina', 'incrustaciones', 'carillas', 'tratamiento_conducto', 'exodoncia', 'cirugia', 'nucleo', 'corona', 'blanqueamiento_dental', 'otro');

-- DropForeignKey
ALTER TABLE "RecomendacionPostQx" DROP CONSTRAINT "RecomendacionPostQx_paciente_id_fkey";

-- AlterTable
ALTER TABLE "Cita" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoCita" NOT NULL DEFAULT 'pendiente';

-- AlterTable
ALTER TABLE "Consentimiento" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoConsentimiento" NOT NULL;

-- AlterTable
ALTER TABLE "Cotizacion" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoCotizacion" NOT NULL DEFAULT 'borrador';

-- AlterTable
ALTER TABLE "CotizacionItem" DROP COLUMN "tipo_item",
ADD COLUMN     "tipo_item" "TipoItem" NOT NULL;

-- AlterTable
ALTER TABLE "HojaEvolucion" DROP COLUMN "hora",
DROP COLUMN "paciente_id";

-- AlterTable
ALTER TABLE "Paciente" DROP COLUMN "edad",
DROP COLUMN "tipo_documento",
ADD COLUMN     "tipo_documento" "TipoDocumento" NOT NULL,
DROP COLUMN "sexo",
ADD COLUMN     "sexo" "Sexo" NOT NULL;

-- AlterTable
ALTER TABLE "Pago" DROP COLUMN "metodo_pago",
ADD COLUMN     "metodo_pago" "MetodoPago" NOT NULL;

-- AlterTable
ALTER TABLE "RecomendacionPostQx" DROP COLUMN "paciente_id";

-- CreateIndex
CREATE INDEX "CertificadoDental_paciente_id_idx" ON "CertificadoDental"("paciente_id");

-- CreateIndex
CREATE INDEX "Cita_paciente_id_idx" ON "Cita"("paciente_id");

-- CreateIndex
CREATE INDEX "Consentimiento_paciente_id_idx" ON "Consentimiento"("paciente_id");

-- CreateIndex
CREATE INDEX "Cotizacion_paciente_id_idx" ON "Cotizacion"("paciente_id");

-- CreateIndex
CREATE INDEX "CotizacionItem_cotizacion_id_idx" ON "CotizacionItem"("cotizacion_id");

-- CreateIndex
CREATE INDEX "HcOdontograma_historia_id_idx" ON "HcOdontograma"("historia_id");

-- CreateIndex
CREATE INDEX "HistoriaClinica_paciente_id_idx" ON "HistoriaClinica"("paciente_id");

-- CreateIndex
CREATE INDEX "HojaEvolucion_historia_id_idx" ON "HojaEvolucion"("historia_id");

-- CreateIndex
CREATE INDEX "Pago_paciente_id_idx" ON "Pago"("paciente_id");

-- AddForeignKey
ALTER TABLE "RecomendacionPostQx" ADD CONSTRAINT "RecomendacionPostQx_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "HistoriaClinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
