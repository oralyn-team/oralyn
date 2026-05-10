const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const handlebars = require('handlebars')

async function generarPDFTest(data) {

  // leer template
  const templatePath = path.join(
    __dirname,
    '../templates/test.hbs'
  )

  const source = fs.readFileSync(templatePath, 'utf8')

  // compilar template
  const template = handlebars.compile(source)

  // insertar datos
  const html = template(data)

  // abrir navegador
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

module.exports = generarPDFTest