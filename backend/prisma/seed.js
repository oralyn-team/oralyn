const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const password_hash = await bcrypt.hash('123456', 10)

  await prisma.usuario.upsert({
  where: { email: 'doctora@oralyn.com' },
  update: {},
  create: {
    email: 'doctora@oralyn.com',
    password_hash,
    nombre: 'Dra. Rocio Murillo',
    nit: '123456789',
  }
})

  console.log('✅ Usuario seed creado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())