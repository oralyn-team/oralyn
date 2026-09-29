-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('confirmacion_cita', 'recordatorio_cita');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('email');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('pendiente', 'enviado', 'error');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN "notificaciones_email" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "consultorio_id" INTEGER NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "cita_id" INTEGER NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "canal" "CanalNotificacion" NOT NULL DEFAULT 'email',
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'pendiente',
    "enviado_at" TIMESTAMP(3),
    "error" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_cita_id_tipo_canal_key" ON "notificaciones"("cita_id", "tipo", "canal");

-- CreateIndex
CREATE INDEX "notificaciones_consultorio_id_idx" ON "notificaciones"("consultorio_id");

-- CreateIndex
CREATE INDEX "notificaciones_paciente_id_idx" ON "notificaciones"("paciente_id");

-- CreateIndex
CREATE INDEX "notificaciones_cita_id_idx" ON "notificaciones"("cita_id");

-- CreateIndex
CREATE INDEX "notificaciones_estado_idx" ON "notificaciones"("estado");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "Configuracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
