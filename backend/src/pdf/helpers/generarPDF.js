const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const handlebars = require('handlebars')
const prisma = require('../../lib/prisma')

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

async function generarPDF({ template, data = {}, consultorio_id }) {
  const config = await obtenerConfig(consultorio_id)

  const firmaDoctorCapturada = data.firma_doctor || null
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

  const dataConFallback = {
    ...data,
    firma_doctor: firmaDoctorFinal,
    firma_doctor_origen: data.firma_doctor_origen ?? firmaDoctorOrigen
  }

  const templatePath = path.resolve(__dirname, '..', 'templates', `${template}.hbs`)
  const source = fs.readFileSync(templatePath, 'utf8')
  const compiledTemplate = handlebars.compile(source)
  const html = compiledTemplate({ ...dataConFallback, config })

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  await browser.close()

  return pdf
}

module.exports = generarPDF