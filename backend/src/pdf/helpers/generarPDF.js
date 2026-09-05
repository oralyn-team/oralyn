const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const handlebars = require('handlebars')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function obtenerConfig(consultorio_id) {
  try {
    const config = consultorio_id
      ? await prisma.configuracion.findUnique({ where: { id: consultorio_id } })
      : await prisma.configuracion.findFirst()

    return config || {
      nombre_consultorio: 'Consultorio Odontológico',
      nombre_profesional: 'Profesional',
      registro_profesional: '',
      nit: '',
      direccion: '',
      telefono: '',
      ciudad: 'Villavicencio',
      email: ''
    }
  } catch {
    return {
      nombre_consultorio: 'Consultorio Odontológico',
      nombre_profesional: 'Profesional',
      registro_profesional: '',
      nit: '',
      direccion: '',
      telefono: '',
      ciudad: 'Villavicencio',
      email: ''
    }
  }
}

async function procesarLogoUrl(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return null
  if (logoUrl.startsWith('data:image/')) return logoUrl
  if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const response = await fetch(logoUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || 'image/png'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch (err) {
    console.warn('No se pudo descargar el logo para el PDF, omitiendo:', err.message)
    return null
  }
}

async function generarPDF({ template, data, consultorio_id }) {
  const config = await obtenerConfig(consultorio_id)

  if (config && config.logo_url) {
    config.logo_url = await procesarLogoUrl(config.logo_url)
  }

  const firmaDoctorCapturada = data?.firma_doctor || null
  const firmaDoctorDefault = config?.firma_doctor_default || null
  let firmaDoctorFinal = null
  let firmaDoctorOrigen = null

  if (firmaDoctorCapturada) {
    firmaDoctorFinal = firmaDoctorCapturada
    firmaDoctorOrigen = 'capturada'
  } else if (firmaDoctorDefault) {
    firmaDoctorFinal = firmaDoctorDefault
    firmaDoctorOrigen = 'default'
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', `${template}.hbs`)
  const source = fs.readFileSync(templatePath, 'utf8')
  const compiledTemplate = handlebars.compile(source)
  const html = compiledTemplate({ ...data, firma_doctor: firmaDoctorFinal, firma_doctor_origen: firmaDoctorOrigen, config })

  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  }

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  } else if (fs.existsSync('/usr/bin/google-chrome-stable')) {
    launchOptions.executablePath = '/usr/bin/google-chrome-stable'
  } else if (fs.existsSync('/usr/bin/chromium-browser')) {
    launchOptions.executablePath = '/usr/bin/chromium-browser'
  } else if (fs.existsSync('/usr/bin/chromium')) {
    launchOptions.executablePath = '/usr/bin/chromium'
  }

  let browser = null
  try {
    browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return pdf
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

module.exports = generarPDF