-- DropForeignKey
ALTER TABLE "Insumo" DROP CONSTRAINT "Insumo_consultorio_id_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoInsumo" DROP CONSTRAINT "MovimientoInsumo_insumo_id_fkey";

-- DropTable
DROP TABLE "Insumo";

-- DropTable
DROP TABLE "MovimientoInsumo";

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad_medida" TEXT NOT NULL,
    "lote" TEXT,
    "registro_invima" TEXT,
    "fabricante" TEXT,
    "proveedor" TEXT,
    "cantidad_actual" DECIMAL(10,2) NOT NULL,
    "stock_minimo" DECIMAL(10,2) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3),
    "fecha_apertura" TIMESTAMP(3),
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_insumo" (
    "id" TEXT NOT NULL,
    "insumo_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "motivo" TEXT,
    "usuario_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insumos_consultorio_id_idx" ON "insumos"("consultorio_id");

-- CreateIndex
CREATE INDEX "movimientos_insumo_insumo_id_idx" ON "movimientos_insumo"("insumo_id");

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_insumo" ADD CONSTRAINT "movimientos_insumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
