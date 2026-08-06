-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "registro" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" SERIAL NOT NULL,
    "primer_apellido" TEXT NOT NULL,
    "segundo_apellido" TEXT,
    "nombres" TEXT NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "numero_documento" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "edad" INTEGER,
    "sexo" TEXT NOT NULL,
    "estado_civil" TEXT,
    "direccion_residencia" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "departamento" TEXT,
    "municipio_ciudad" TEXT NOT NULL,
    "ocupacion" TEXT,
    "rh" TEXT,
    "clase_seguro" TEXT,
    "asegurador" TEXT,
    "rango_salarial" TEXT,
    "tipo_vinculacion" TEXT,
    "nombre_empresa" TEXT,
    "acudiente_nombre" TEXT,
    "acudiente_parentesco" TEXT,
    "acudiente_telefono" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriaClinica" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "fecha_atencion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo_consulta" TEXT NOT NULL,
    "evento_adverso" BOOLEAN NOT NULL DEFAULT false,
    "evento_adverso_obs" TEXT,
    "habitos_json" JSONB,
    "habitos_observaciones" TEXT,
    "diagnostico" TEXT NOT NULL,
    "tratamiento_realizado" TEXT,
    "observaciones" TEXT,
    "recomendaciones" TEXT,
    "firma_doctor" TEXT,
    "firma_paciente" TEXT,

    CONSTRAINT "HistoriaClinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HcAntecedentes" (
    "id" SERIAL NOT NULL,
    "historia_id" INTEGER NOT NULL,
    "tratamiento_medicacion" BOOLEAN NOT NULL DEFAULT false,
    "tratamiento_med_obs" TEXT,
    "reacciones_alergicas" BOOLEAN NOT NULL DEFAULT false,
    "alergias_obs" TEXT,
    "problemas_coagulacion" BOOLEAN NOT NULL DEFAULT false,
    "coagulacion_obs" TEXT,
    "irradiaciones" BOOLEAN NOT NULL DEFAULT false,
    "irradiaciones_obs" TEXT,
    "tension_arterial" BOOLEAN NOT NULL DEFAULT false,
    "tension_obs" TEXT,
    "sinusitis" BOOLEAN NOT NULL DEFAULT false,
    "sinusitis_obs" TEXT,
    "enf_respiratorias" BOOLEAN NOT NULL DEFAULT false,
    "respiratorias_obs" TEXT,
    "cardiopatias" BOOLEAN NOT NULL DEFAULT false,
    "cardiopatias_obs" TEXT,
    "diabetes" BOOLEAN NOT NULL DEFAULT false,
    "diabetes_obs" TEXT,
    "fiebre_reumatica" BOOLEAN NOT NULL DEFAULT false,
    "fiebre_obs" TEXT,
    "hepatitis" BOOLEAN NOT NULL DEFAULT false,
    "hepatitis_obs" TEXT,
    "vih" BOOLEAN NOT NULL DEFAULT false,
    "vih_obs" TEXT,
    "trastornos_emocionales" BOOLEAN NOT NULL DEFAULT false,
    "emocionales_obs" TEXT,
    "observaciones_generales" TEXT,

    CONSTRAINT "HcAntecedentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HcExamenEstomatologico" (
    "id" SERIAL NOT NULL,
    "historia_id" INTEGER NOT NULL,
    "estructuras_json" JSONB,
    "observaciones" TEXT,
    "examen_pulpar_json" JSONB,
    "pulpar_obs" TEXT,
    "tejidos_json" JSONB,
    "tejidos_obs" TEXT,
    "periodontal_json" JSONB,
    "dx_periodontal" TEXT,
    "periodontal_obs" TEXT,

    CONSTRAINT "HcExamenEstomatologico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HcOdontograma" (
    "id" SERIAL NOT NULL,
    "historia_id" INTEGER NOT NULL,
    "dientes_json" JSONB NOT NULL,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HcOdontograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HojaEvolucion" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "historia_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "diente" TEXT,
    "cavidad" TEXT,
    "tipo_consulta" TEXT,
    "procedimiento_realizado" TEXT NOT NULL,
    "firma_odontologo" TEXT,
    "firma_paciente" TEXT,

    CONSTRAINT "HojaEvolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "procedimiento" TEXT NOT NULL,
    "codigo_cups" TEXT,
    "codigo_cie10" TEXT,
    "valor_cobrado" DECIMAL(10,2),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "causas_no_atencion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "observaciones" TEXT,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionItem" (
    "id" SERIAL NOT NULL,
    "cotizacion_id" INTEGER NOT NULL,
    "tipo_item" TEXT NOT NULL,
    "descripcion_otro" TEXT,
    "numero" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "CotizacionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo_pago" TEXT NOT NULL,
    "concepto" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentimiento" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL DEFAULT 'Villavicencio',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campos_especificos" JSONB,
    "nombre_paciente_declarado" TEXT,
    "cc_paciente_declarado" TEXT,
    "firma_paciente" TEXT,
    "cc_profesional" TEXT,
    "firma_doctor" TEXT,
    "pdf_generado_en" TIMESTAMP(3),

    CONSTRAINT "Consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificadoDental" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "cita_id" INTEGER,
    "tipo_cita_texto" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL DEFAULT 'Villavicencio',
    "fecha_expedicion" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificadoDental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecomendacionPostQx" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "historia_id" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecomendacionPostQx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_numero_documento_key" ON "Paciente"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "HcAntecedentes_historia_id_key" ON "HcAntecedentes"("historia_id");

-- CreateIndex
CREATE UNIQUE INDEX "HcExamenEstomatologico_historia_id_key" ON "HcExamenEstomatologico"("historia_id");

-- AddForeignKey
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HcAntecedentes" ADD CONSTRAINT "HcAntecedentes_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HcExamenEstomatologico" ADD CONSTRAINT "HcExamenEstomatologico_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HcOdontograma" ADD CONSTRAINT "HcOdontograma_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaEvolucion" ADD CONSTRAINT "HojaEvolucion_historia_id_fkey" FOREIGN KEY ("historia_id") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionItem" ADD CONSTRAINT "CotizacionItem_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoDental" ADD CONSTRAINT "CertificadoDental_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoDental" ADD CONSTRAINT "CertificadoDental_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecomendacionPostQx" ADD CONSTRAINT "RecomendacionPostQx_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
