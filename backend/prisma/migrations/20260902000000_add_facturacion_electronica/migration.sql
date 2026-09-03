-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('pendiente', 'validada', 'rechazada', 'anulada');

-- AlterTable
ALTER TABLE "Configuracion" ADD COLUMN     "facturacion_habilitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "factus_client_id" TEXT,
ADD COLUMN     "factus_client_secret" TEXT,
ADD COLUMN     "factus_numbering_range_id" INTEGER,
ADD COLUMN     "factus_password" TEXT,
ADD COLUMN     "factus_username" TEXT,
ADD COLUMN     "municipio_code" TEXT,
ADD COLUMN     "nit_dv" TEXT,
ADD COLUMN     "razon_social" TEXT;

-- CreateTable
CREATE TABLE "Factura" (
    "id" SERIAL NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "cotizacion_id" INTEGER,
    "pago_id" INTEGER,
    "reference_code" TEXT NOT NULL,
    "numero" TEXT,
    "prefijo" TEXT,
    "cufe" TEXT,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'pendiente',
    "errores" JSONB,
    "qr_url" TEXT,
    "public_url" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impuestos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "items_json" JSONB NOT NULL,
    "notas_credito" JSONB,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_validacion" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Factura_reference_code_key" ON "Factura"("reference_code");

-- CreateIndex
CREATE INDEX "Factura_consultorio_id_idx" ON "Factura"("consultorio_id");

-- CreateIndex
CREATE INDEX "Factura_paciente_id_idx" ON "Factura"("paciente_id");

-- CreateIndex
CREATE INDEX "Factura_cotizacion_id_idx" ON "Factura"("cotizacion_id");

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;
