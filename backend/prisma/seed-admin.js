const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador Platform'

  if (!email || !password) {
    console.error('❌ Error: Las variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD son obligatorias para sembrar el administrador.')
    process.exit(1)
  }

  console.log('Sembrando administrador inicial...')
  console.log(`Email: ${email}`)
  console.log(`Nombre: ${nombre}`)

  const password_hash = await bcrypt.hash(password, 10)

  const admin = await prisma.administrador.upsert({
    where: { email },
    update: {
      nombre,
      password_hash,
      activo: true
    },
    create: {
      email,
      password_hash,
      nombre,
      activo: true
    }
  })

  console.log('✅ Administrador sembrado con éxito:', admin.id)
}

main()
  .catch((err) => {
    console.error('❌ Error sembrando administrador:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
