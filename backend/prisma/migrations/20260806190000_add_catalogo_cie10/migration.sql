-- CreateTable
CREATE TABLE "catalogo_oficial_cie10" (
    "id" SERIAL NOT NULL,
    "codigo_cie10" TEXT NOT NULL,
    "nombre_oficial" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_oficial_cie10_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_oficial_cie10_codigo_cie10_key" ON "catalogo_oficial_cie10"("codigo_cie10");
