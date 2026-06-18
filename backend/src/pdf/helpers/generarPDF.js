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

async function generarPDF({ template, data, consultorio_id }) {
  const config = await obtenerConfig(consultorio_id)

  const templatePath = path.resolve(__dirname, '..', 'templates', `${template}.hbs`)
  const source = fs.readFileSync(templatePath, 'utf8')
  const compiledTemplate = handlebars.compile(source)
  const html = compiledTemplate({ ...data, config })

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  await browser.close()

  return pdf
}

module.exports = generarPDF