-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "procedimiento_consultorio_id" INTEGER;

-- AlterTable
ALTER TABLE "HojaEvolucion" ADD COLUMN     "procedimiento_consultorio_id" INTEGER;

-- AlterTable
ALTER TABLE "ProcedimientoCotizacion" ADD COLUMN     "procedimiento_consultorio_id" INTEGER;

-- CreateTable
CREATE TABLE "catalogo_oficial_cups" (
    "id" SERIAL NOT NULL,
    "codigo_cups" TEXT NOT NULL,
    "nombre_oficial" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "es_frecuente" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_oficial_cups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedimientos_consultorio" (
    "id" SERIAL NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "catalogo_oficial_id" INTEGER NOT NULL,
    "nombre_visible" TEXT NOT NULL,
    "precio" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedimientos_consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rips_generaciones" (
    "id" SERIAL NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "cantidad_registros" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'generado',
    "json_generado" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rips_generaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_oficial_cups_codigo_cups_key" ON "catalogo_oficial_cups"("codigo_cups");

-- CreateIndex
CREATE INDEX "procedimientos_consultorio_consultorio_id_idx" ON "procedimientos_consultorio"("consultorio_id");

-- CreateIndex
CREATE UNIQUE INDEX "procedimientos_consultorio_consultorio_id_catalogo_oficial__key" ON "procedimientos_consultorio"("consultorio_id", "catalogo_oficial_id");

-- CreateIndex
CREATE INDEX "rips_generaciones_consultorio_id_idx" ON "rips_generaciones"("consultorio_id");

-- AddForeignKey
ALTER TABLE "procedimientos_consultorio" ADD CONSTRAINT "procedimientos_consultorio_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedimientos_consultorio" ADD CONSTRAINT "procedimientos_consultorio_catalogo_oficial_id_fkey" FOREIGN KEY ("catalogo_oficial_id") REFERENCES "catalogo_oficial_cups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rips_generaciones" ADD CONSTRAINT "rips_generaciones_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaEvolucion" ADD CONSTRAINT "HojaEvolucion_procedimiento_consultorio_id_fkey" FOREIGN KEY ("procedimiento_consultorio_id") REFERENCES "procedimientos_consultorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedimientoCotizacion" ADD CONSTRAINT "ProcedimientoCotizacion_procedimiento_consultorio_id_fkey" FOREIGN KEY ("procedimiento_consultorio_id") REFERENCES "procedimientos_consultorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_procedimiento_consultorio_id_fkey" FOREIGN KEY ("procedimiento_consultorio_id") REFERENCES "procedimientos_consultorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
