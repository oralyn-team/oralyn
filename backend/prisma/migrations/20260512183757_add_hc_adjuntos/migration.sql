-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "doctor" TEXT,
ADD COLUMN     "observaciones" TEXT;

-- CreateTable
CREATE TABLE "hc_adjuntos" (
    "id" SERIAL NOT NULL,
    "historia_id" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tipo" TEXT,
    "mime_type" TEXT,
    "tamano_bytes" INTEGER,
    "contenido_base64" TEXT,
    "url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hc_adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hc_adjuntos_historia_id_idx" ON "hc_adjuntos"("historia_id");

-- AddForeignKey
ALTER TABLE "hc_adjuntos" ADD CONSTRAINT "hc_adjuntos_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "HistoriaClinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;
