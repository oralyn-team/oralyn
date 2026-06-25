/*
  Warnings:

  - The values [aprobada,rechazada,pagada] on the enum `EstadoCotizacion` will be removed. If these variants are still used in the database, this will fail.
  - The values [transferencia,tarjeta] on the enum `MetodoPago` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `descuento` on the `Cotizacion` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `Cotizacion` table. All the data in the column will be lost.
  - You are about to drop the column `cavidad` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `diente` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `firma_odontologo` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `firma_paciente` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `procedimiento_realizado` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_consulta` on the `HojaEvolucion` table. All the data in the column will be lost.
  - You are about to drop the `CotizacionItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoProcedimiento" AS ENUM ('pendiente', 'en_proceso', 'realizado', 'cancelado');

-- CreateEnum
CREATE TYPE "AplicaEn" AS ENUM ('general', 'dientes', 'cuadrante');

-- CreateEnum
CREATE TYPE "PrioridadTratamiento" AS ENUM ('baja', 'media', 'alta');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoCotizacion_new" AS ENUM ('borrador', 'pendiente', 'aprobado', 'en_proceso', 'finalizado', 'cancelado');
ALTER TABLE "Cotizacion" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Cotizacion" ALTER COLUMN "estado" TYPE "EstadoCotizacion_new" USING ("estado"::text::"EstadoCotizacion_new");
ALTER TYPE "EstadoCotizacion" RENAME TO "EstadoCotizacion_old";
ALTER TYPE "EstadoCotizacion_new" RENAME TO "EstadoCotizacion";
DROP TYPE "EstadoCotizacion_old";
ALTER TABLE "Cotizacion" ALTER COLUMN "estado" SET DEFAULT 'borrador';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MetodoPago_new" AS ENUM ('efectivo', 'transferencia_bancaria', 'tarjeta_debito', 'tarjeta_credito', 'nequi', 'daviplata', 'otro');
ALTER TABLE "Pago" ALTER COLUMN "metodo_pago" TYPE "MetodoPago_new" USING ("metodo_pago"::text::"MetodoPago_new");
ALTER TYPE "MetodoPago" RENAME TO "MetodoPago_old";
ALTER TYPE "MetodoPago_new" RENAME TO "MetodoPago";
DROP TYPE "MetodoPago_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CotizacionItem" DROP CONSTRAINT "CotizacionItem_cotizacion_id_fkey";

-- AlterTable
ALTER TABLE "Cotizacion" DROP COLUMN "descuento",
DROP COLUMN "subtotal",
ADD COLUMN     "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctor_id" INTEGER,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "prioridad" "PrioridadTratamiento" NOT NULL DEFAULT 'media',
ADD COLUMN     "saldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tipo_tratamiento" TEXT,
ADD COLUMN     "total_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "HojaEvolucion" DROP COLUMN "cavidad",
DROP COLUMN "diente",
DROP COLUMN "firma_odontologo",
DROP COLUMN "firma_paciente",
DROP COLUMN "procedimiento_realizado",
DROP COLUMN "tipo_consulta",
ADD COLUMN     "diagnostico" TEXT,
ADD COLUMN     "doctor" TEXT,
ADD COLUMN     "estado_clinico" TEXT,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "piezas_tratadas" TEXT,
ADD COLUMN     "procedimiento" TEXT,
ADD COLUMN     "proximo_control" TIMESTAMP(3),
ADD COLUMN     "recomendaciones" TEXT,
ADD COLUMN     "tratamiento" TEXT;

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "cotizacion_id" INTEGER,
ADD COLUMN     "referencia" TEXT;

-- DropTable
DROP TABLE "CotizacionItem";

-- CreateTable
CREATE TABLE "ProcedimientoCotizacion" (
    "id" SERIAL NOT NULL,
    "cotizacion_id" INTEGER NOT NULL,
    "procedimiento" TEXT NOT NULL,
    "descripcion" TEXT,
    "aplica_en" "AplicaEn" NOT NULL DEFAULT 'general',
    "dientes" INTEGER[],
    "cuadrante" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoProcedimiento" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProcedimientoCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcedimientoCotizacion_cotizacion_id_idx" ON "ProcedimientoCotizacion"("cotizacion_id");

-- CreateIndex
CREATE INDEX "Cotizacion_doctor_id_idx" ON "Cotizacion"("doctor_id");

-- CreateIndex
CREATE INDEX "Pago_cotizacion_id_idx" ON "Pago"("cotizacion_id");

-- AddForeignKey
ALTER TABLE "ProcedimientoCotizacion" ADD CONSTRAINT "ProcedimientoCotizacion_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
