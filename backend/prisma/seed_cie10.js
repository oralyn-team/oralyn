const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function parseCSVLine(text) {
  const result = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(cell.trim())
      cell = ''
    } else {
      cell += c
    }
  }
  result.push(cell.trim())
  return result
}

async function seedCie10() {
  const csvPath = 'C:\\Users\\valen\\Downloads\\catalogo_rips_odontologia.csv'
  if (!fs.existsSync(csvPath)) {
    console.error('No se encontró el archivo CSV en:', csvPath)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)

  const cie10Items = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length >= 4) {
      const [tipo, categoria, codigo, nombre] = cols
      if (tipo.toUpperCase() === 'CIE10') {
        cie10Items.push({
          codigo_cie10: codigo.trim(),
          nombre_oficial: nombre.trim(),
          categoria: categoria.trim(),
          activo: true
        })
      }
    }
  }

  console.log(`Poblando catálogo oficial CIE-10 (${cie10Items.length} registros)...`)

  const res = await prisma.catalogoOficialCie10.createMany({
    data: cie10Items,
    skipDuplicates: true
  })

  console.log(`✅ Seed CIE-10 completado. Se insertaron ${res.count} registros nuevos.`)
}

if (require.main === module) {
  seedCie10()
    .catch(err => {
      console.error('Error durante el seed de CIE-10:', err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}

module.exports = { seedCie10 }
