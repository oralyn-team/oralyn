-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad_medida" TEXT NOT NULL,
    "lote" TEXT,
    "registro_invima" TEXT,
    "fabricante" TEXT,
    "proveedor" TEXT,
    "cantidad_actual" DECIMAL(65,30) NOT NULL,
    "stock_minimo" DECIMAL(65,30) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3),
    "fecha_apertura" TIMESTAMP(3),
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInsumo" (
    "id" TEXT NOT NULL,
    "insumo_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "motivo" TEXT,
    "usuario_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insumo_consultorio_id_idx" ON "Insumo"("consultorio_id");

-- CreateIndex
CREATE INDEX "MovimientoInsumo_insumo_id_idx" ON "MovimientoInsumo"("insumo_id");

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInsumo" ADD CONSTRAINT "MovimientoInsumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
