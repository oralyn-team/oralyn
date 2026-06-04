const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const handlebars = require('handlebars')

async function generarPDF({ template, data }) {

  // ruta template
  const templatePath = path.resolve(
    __dirname,
    '..',
    'templates',
    `${template}.hbs`
  )

  // leer archivo
  const source = fs.readFileSync(templatePath, 'utf8')

  // compilar
  const compiledTemplate = handlebars.compile(source)

  // insertar datos
  const html = compiledTemplate(data)

  // iniciar navegador
  const browser = await puppeteer.launch()

  const page = await browser.newPage()

  // cargar html
  await page.setContent(html, {
    waitUntil: 'domcontentloaded'
  })

  // generar pdf
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true
  })

  await browser.close()

  return pdf
}

module.exports = generarPDF