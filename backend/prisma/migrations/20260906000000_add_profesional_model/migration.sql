-- CreateTable
CREATE TABLE "Profesional" (
    "id" SERIAL NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "cedula_profesional" TEXT,
    "firma_default" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CertificadoDental" ADD COLUMN "profesional_id" INTEGER;

-- AlterTable
ALTER TABLE "Cita" ADD COLUMN "profesional_id" INTEGER;

-- AlterTable
ALTER TABLE "Consentimiento" ADD COLUMN "profesional_id" INTEGER;

-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN "profesional_id" INTEGER;

-- AlterTable
ALTER TABLE "HistoriaClinica" ADD COLUMN "profesional_id" INTEGER;

-- AlterTable
ALTER TABLE "HojaEvolucion" ADD COLUMN "profesional_id" INTEGER;

-- AlterTable
ALTER TABLE "RecomendacionPostQx" ADD COLUMN "profesional_id" INTEGER;

-- CreateIndex
CREATE INDEX "Profesional_consultorio_id_idx" ON "Profesional"("consultorio_id");

-- CreateIndex
CREATE INDEX "CertificadoDental_profesional_id_idx" ON "CertificadoDental"("profesional_id");

-- CreateIndex
CREATE INDEX "Cita_profesional_id_idx" ON "Cita"("profesional_id");

-- CreateIndex
CREATE INDEX "Consentimiento_profesional_id_idx" ON "Consentimiento"("profesional_id");

-- CreateIndex
CREATE INDEX "Cotizacion_profesional_id_idx" ON "Cotizacion"("profesional_id");

-- CreateIndex
CREATE INDEX "HistoriaClinica_profesional_id_idx" ON "HistoriaClinica"("profesional_id");

-- CreateIndex
CREATE INDEX "HojaEvolucion_profesional_id_idx" ON "HojaEvolucion"("profesional_id");

-- CreateIndex
CREATE INDEX "RecomendacionPostQx_profesional_id_idx" ON "RecomendacionPostQx"("profesional_id");

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaEvolucion" ADD CONSTRAINT "HojaEvolucion_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoDental" ADD CONSTRAINT "CertificadoDental_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecomendacionPostQx" ADD CONSTRAINT "RecomendacionPostQx_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
