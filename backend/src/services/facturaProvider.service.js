// backend/src/services/facturaProvider.service.js
//
// Integración con la API de Factus (https://developers.factus.com.co) para
// facturación electrónica ante la DIAN.
//
// Modelo "casa de software" / multiempresa: cada consultorio (Configuracion)
// tiene sus propias credenciales Factus (factus_client_id, factus_client_secret,
// factus_username, factus_password), porque cada consultorio factura con su
// propio NIT y su propio rango de numeración autorizado por la DIAN.
//
// Usa fetch nativo de Node (disponible desde Node 18+, este proyecto corre en
// Node 20/22), sin dependencias nuevas.

const FACTUS_ENV = process.env.FACTUS_ENV === 'production' ? 'production' : 'sandbox'

const FACTUS_BASE_URL = FACTUS_ENV === 'production'
  ? 'https://api.factus.com.co'
  : 'https://api-sandbox.factus.com.co'

// ── Caché de tokens en memoria, por consultorio_id ──
// { [consultorio_id]: { access_token, refresh_token, expires_at } }
const tokenCache = new Map()

class FacturaProviderError extends Error {
  constructor(message, { status, detalle } = {}) {
    super(message)
    this.name = 'FacturaProviderError'
    this.status = status || 502
    this.detalle = detalle
  }
}

// ── Autenticación OAuth2 (password grant) ──
// Nota: el endpoint de auth de Factus recibe form-data, no JSON (a diferencia
// del resto de la API).
async function autenticar(configuracion) {
  const { factus_client_id, factus_client_secret, factus_username, factus_password } = configuracion

  if (!factus_client_id || !factus_client_secret || !factus_username || !factus_password) {
    throw new FacturaProviderError(
      'El consultorio no tiene configuradas las credenciales de Factus (factus_client_id/secret/username/password).',
      { status: 422 }
    )
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: factus_client_id,
    client_secret: factus_client_secret,
    username: factus_username,
    password: factus_password,
  })

  const resp = await fetch(`${FACTUS_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await resp.json().catch(() => null)

  if (!resp.ok || !data?.access_token) {
    throw new FacturaProviderError('No se pudo autenticar contra Factus.', {
      status: resp.status,
      detalle: data,
    })
  }

  return data // { access_token, refresh_token, expires_in, ... }
}

async function refrescarToken(configuracion, refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: configuracion.factus_client_id,
    client_secret: configuracion.factus_client_secret,
    refresh_token: refreshToken,
  })

  const resp = await fetch(`${FACTUS_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await resp.json().catch(() => null)
  if (!resp.ok || !data?.access_token) return null // si falla, se hace login completo de nuevo
  return data
}

async function obtenerAccessToken(configuracion) {
  const cacheKey = configuracion.id
  const cacheado = tokenCache.get(cacheKey)
  const ahora = Date.now()

  if (cacheado && cacheado.expires_at > ahora + 30_000) {
    return cacheado.access_token
  }

  let data
  if (cacheado?.refresh_token) {
    data = await refrescarToken(configuracion, cacheado.refresh_token)
  }
  if (!data) {
    data = await autenticar(configuracion)
  }

  tokenCache.set(cacheKey, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    // Factus expira el access_token cada hora; refrescamos con margen de 1 min.
    expires_at: ahora + (Number(data.expires_in || 3600) * 1000),
  })

  return data.access_token
}

// ── Helper genérico para llamar cualquier endpoint de Factus ──
async function factusFetch(configuracion, path, { method = 'GET', body, isJson = true } = {}) {
  const token = await obtenerAccessToken(configuracion)

  const resp = await fetch(`${FACTUS_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!isJson) return resp // para descargas binarias (PDF/XML), el caller maneja el stream/buffer

  const data = await resp.json().catch(() => null)

  if (!resp.ok) {
    throw new FacturaProviderError(data?.message || 'Error en la petición a Factus.', {
      status: resp.status,
      detalle: data,
    })
  }

  return data
}

// ── Mapeo: TipoDocumento (Prisma) → identification_document_code (Factus/DIAN) ──
// Códigos confirmados en la documentación de Factus: 13 (CC), 31 (NIT), 91 (NUIP).
// El resto son los códigos estándar del anexo técnico DIAN de uso extendido en la
// industria — verificar contra developers.factus.com.co/tablas-de-referencia si
// Factus llega a reportar un rechazo por código de documento inválido.
const CODIGO_TIPO_DOCUMENTO = {
  RC: '11',
  TI: '12',
  CC: '13',
  CE: '22',
  NUIP: '91',
  PAS: '41',
}

function mapTipoDocumento(tipoDocumento) {
  return CODIGO_TIPO_DOCUMENTO[tipoDocumento] || '13'
}

// ── Construcción del payload de Factus a partir de nuestros datos ──
//
// paciente: registro Prisma de Paciente
// items: [{ nombre, cantidad, valorUnitario, codigoCups }]
// pagos: [{ monto, metodoPagoCode, formaPagoCode }] (ver tabla de formas/métodos de pago Factus)
// referenceCode: identificador único nuestro (idempotencia ante Factus)
function construirPayloadFactura({ paciente, items, pagos, referenceCode, observacion }) {
  const nombreCompleto = `${paciente.nombres} ${paciente.primer_apellido} ${paciente.segundo_apellido || ''}`.trim()

  return {
    reference_code: referenceCode,
    document: '01', // factura electrónica de venta
    operation_type: '10', // estándar
    observation: observacion || undefined,
    customer: {
      identification_document_code: mapTipoDocumento(paciente.tipo_documento),
      identification: paciente.numero_documento,
      legal_organization_code: '2', // persona natural (los pacientes son siempre personas naturales)
      names: nombreCompleto,
      address: paciente.direccion_residencia || undefined,
      email: paciente.correo || undefined,
      phone: paciente.telefono || undefined,
      country_code: 'CO',
      tribute_code: 'ZZ', // no responsable de IVA (consumidor final) — ajustar si aplica otro caso
      // municipality_code requiere el código DIVIPOLA numérico; paciente.municipio_ciudad
      // hoy es texto libre, así que se omite hasta tener un catálogo de municipios mapeado.
    },
    payment_details: (pagos && pagos.length > 0) ? pagos.map((p) => ({
      payment_form: p.formaPagoCode || '1', // 1 = contado
      payment_method_code: p.metodoPagoCode || '10',
      amount: String(p.monto),
    })) : [{
      payment_form: '1',
      payment_method_code: '10',
      amount: String(items.reduce((acc, i) => acc + Number(i.valorUnitario) * Number(i.cantidad || 1), 0))
    }],
    items: items.map((item) => ({
      code_reference: item.codigoCups || item.cupsCode || 'SERV-ODONTO',
      name: item.nombre || item.description || 'Procedimiento Odontológico',
      quantity: String(item.cantidad ?? item.quantity ?? 1),
      price: String(item.valorUnitario ?? item.unitPrice ?? 0),
      unit_measure_code: '94', // unidad
      standard_code: '999', // estándar de adopción del contribuyente (servicios odontológicos)
      taxes: [
        { code: '01', rate: '0.00', is_excluded: true }, // servicios de salud: excluidos de IVA
      ],
    })),
  }
}

// ── Mapeo: MetodoPago (Prisma, el enum que ya usan en Pago/Cotizacion) → método de pago Factus ──
// Códigos de referencia habituales en el anexo DIAN: 10 Efectivo, 42 Consignación/Transferencia,
// 48 Tarjeta débito, 49 Tarjeta crédito. Verificar contra la tabla oficial de Factus antes de producción.
const CODIGO_METODO_PAGO = {
  efectivo: '10',
  transferencia_bancaria: '42',
  tarjeta_debito: '48',
  tarjeta_credito: '49',
  nequi: '63',
  daviplata: '63',
  otro: '1',
  Efectivo: '10',
  Transferencia: '42',
  Tarjeta: '48'
}

function mapMetodoPago(metodoPago) {
  return CODIGO_METODO_PAGO[metodoPago] || '10'
}

// ── Operaciones expuestas ──

async function crearYValidarFactura(configuracion, payload) {
  return factusFetch(configuracion, '/v2/bills/validate', { method: 'POST', body: payload })
}

async function obtenerFacturaPorNumero(configuracion, numero) {
  return factusFetch(configuracion, `/v2/bills/show/${encodeURIComponent(numero)}`)
}

async function listarFacturas(configuracion, queryParams = {}) {
  const query = new URLSearchParams(queryParams).toString()
  return factusFetch(configuracion, `/v2/bills${query ? `?${query}` : ''}`)
}

async function descargarPdf(configuracion, numero) {
  return factusFetch(configuracion, `/v2/bills/download-pdf/${encodeURIComponent(numero)}`, { isJson: false })
}

async function descargarXml(configuracion, numero) {
  return factusFetch(configuracion, `/v2/bills/download-xml/${encodeURIComponent(numero)}`, { isJson: false })
}

async function eliminarFacturaNoValidada(configuracion, referenceCode) {
  return factusFetch(configuracion, `/v2/bills/${encodeURIComponent(referenceCode)}`, { method: 'DELETE' })
}

async function crearNotaCredito(configuracion, payload) {
  return factusFetch(configuracion, '/v2/credit-notes/validate', { method: 'POST', body: payload })
}

module.exports = {
  FacturaProviderError,
  construirPayloadFactura,
  mapTipoDocumento,
  mapMetodoPago,
  crearYValidarFactura,
  obtenerFacturaPorNumero,
  listarFacturas,
  descargarPdf,
  descargarXml,
  eliminarFacturaNoValidada,
  crearNotaCredito,
}
