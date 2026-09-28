const TIPOS_ODONTOGRAMA = Object.freeze({
  GENERAL_ADULTO: 'GENERAL_ADULTO',
  GENERAL_INFANTIL: 'GENERAL_INFANTIL',
  ORTODONCIA: 'ORTODONCIA',
})

const TIPO_DEFAULT = TIPOS_ODONTOGRAMA.GENERAL_ADULTO

const ALIASES_TIPO = Object.freeze({
  GENERAL_ADULTO: TIPOS_ODONTOGRAMA.GENERAL_ADULTO,
  GENERAL_INFANTIL: TIPOS_ODONTOGRAMA.GENERAL_INFANTIL,
  ORTODONCIA: TIPOS_ODONTOGRAMA.ORTODONCIA,
  general_adulto: TIPOS_ODONTOGRAMA.GENERAL_ADULTO,
  general_infantil: TIPOS_ODONTOGRAMA.GENERAL_INFANTIL,
  ortodoncia: TIPOS_ODONTOGRAMA.ORTODONCIA,
  adulto: TIPOS_ODONTOGRAMA.GENERAL_ADULTO,
  infantil: TIPOS_ODONTOGRAMA.GENERAL_INFANTIL,
  generalAdulto: TIPOS_ODONTOGRAMA.GENERAL_ADULTO,
  generalInfantil: TIPOS_ODONTOGRAMA.GENERAL_INFANTIL,
  ortho: TIPOS_ODONTOGRAMA.ORTODONCIA,
  orthodontics: TIPOS_ODONTOGRAMA.ORTODONCIA,
  'General Adulto': TIPOS_ODONTOGRAMA.GENERAL_ADULTO,
  'General Infantil': TIPOS_ODONTOGRAMA.GENERAL_INFANTIL,
  Ortodoncia: TIPOS_ODONTOGRAMA.ORTODONCIA,
})

const ORDEN_TIPOS = Object.freeze([
  TIPOS_ODONTOGRAMA.GENERAL_ADULTO,
  TIPOS_ODONTOGRAMA.GENERAL_INFANTIL,
  TIPOS_ODONTOGRAMA.ORTODONCIA,
])

function normalizarTipoOdontograma(tipo = TIPO_DEFAULT) {
  if (!tipo) return TIPO_DEFAULT

  const valor = String(tipo).trim()
  const normalizado = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\s]+/g, '_')
    .toUpperCase()

  const tipoNormalizado = ALIASES_TIPO[valor] || ALIASES_TIPO[normalizado] || ALIASES_TIPO[normalizado.toLowerCase()]
  if (!tipoNormalizado) {
    const tiposValidos = ORDEN_TIPOS.join(', ')
    const error = new Error(`Tipo de odontograma invalido. Tipos validos: ${tiposValidos}`)
    error.statusCode = 400
    throw error
  }

  return tipoNormalizado
}

function ordenarOdontogramas(odontogramas = []) {
  return [...odontogramas].sort((a, b) => {
    const ordenA = ORDEN_TIPOS.indexOf(a.tipo)
    const ordenB = ORDEN_TIPOS.indexOf(b.tipo)
    if (ordenA !== ordenB) return ordenA - ordenB
    return new Date(b.actualizado_en || b.creado_en) - new Date(a.actualizado_en || a.creado_en)
  })
}

function extraerDatosOdontograma(body = {}) {
  const { dientes_json, informacion, data, observaciones } = body
  const datos = dientes_json ?? informacion ?? data

  return {
    dientes_json: datos,
    observaciones: observaciones ?? null,
  }
}

async function obtenerHistoriaAutorizada(prisma, historiaId, consultorioId) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { id: historiaId },
    include: { paciente: { select: { consultorio_id: true } } },
  })

  if (!historia || historia.paciente.consultorio_id !== consultorioId) {
    return null
  }

  return historia
}

async function listarOdontogramas(prisma, historiaId) {
  const odontogramas = await prisma.hcOdontograma.findMany({
    where: { historia_id: historiaId },
  })

  return ordenarOdontogramas(odontogramas)
}

async function obtenerOdontograma(prisma, historiaId, tipo) {
  const tipoNormalizado = normalizarTipoOdontograma(tipo)

  return prisma.hcOdontograma.findFirst({
    where: { historia_id: historiaId, tipo: tipoNormalizado },
    orderBy: [{ actualizado_en: 'desc' }, { creado_en: 'desc' }],
  })
}

function errorConflictoVersion() {
  const error = new Error('CONFLICTO_VERSION')
  error.conflictoVersion = true
  return error
}

/**
 * Guarda un odontograma con control de concurrencia optimista.
 *
 * `versionRecibida` es la versión de la fila HcOdontograma que cargó el cliente:
 *  - 0  → el cliente cree que ese tipo aún no existe: se CREA la fila (queda con version 1).
 *         Si otro usuario la creó mientras tanto, la restricción única [historia_id, tipo]
 *         falla (P2002) y se responde como conflicto, sin sobrescribir.
 *  - ≥1 → se ACTUALIZA solo si la versión en BD sigue siendo esa; si no coincide
 *         (otro usuario guardó antes), se lanza conflicto y no se escribe nada.
 * El llamador debe validar antes que sea un entero ≥ 0 (omitirla no es válido).
 *
 * Devuelve la fila completa con su versión nueva. Lanza un error con `conflictoVersion = true`.
 */
async function guardarOdontograma(prisma, historiaId, tipo, datos, versionRecibida) {
  const tipoNormalizado = normalizarTipoOdontograma(tipo)

  if (versionRecibida === 0) {
    try {
      return await prisma.hcOdontograma.create({
        data: { historia_id: historiaId, tipo: tipoNormalizado, ...datos, version: 1 },
      })
    } catch (error) {
      if (error.code === 'P2002') throw errorConflictoVersion()
      throw error
    }
  }

  // Actualización condicionada + relectura en la misma transacción: el updateMany bloquea la fila
  // hasta el commit, así que la relectura devuelve exactamente la versión que acaba de escribir.
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.hcOdontograma.updateMany({
      where: { historia_id: historiaId, tipo: tipoNormalizado, version: versionRecibida },
      data: { ...datos, version: { increment: 1 } },
    })
    if (count === 0) throw errorConflictoVersion()

    return tx.hcOdontograma.findUnique({
      where: { historia_id_tipo: { historia_id: historiaId, tipo: tipoNormalizado } },
    })
  })
}

module.exports = {
  TIPO_DEFAULT,
  TIPOS_ODONTOGRAMA,
  normalizarTipoOdontograma,
  ordenarOdontogramas,
  extraerDatosOdontograma,
  obtenerHistoriaAutorizada,
  listarOdontogramas,
  obtenerOdontograma,
  guardarOdontograma,
}
