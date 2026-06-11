const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
<<<<<<< HEAD

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
=======
const prisma = new PrismaClient()

async function main() {
  // Crear o actualizar configuración del consultorio
  const config = await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre_consultorio: 'RM Dientes Felices',
      nombre_profesional: 'Rocío Murillo',
      registro_profesional: '3989',
      nit: '39579364-3',
      direccion: 'Calle 32 #38-81 Barzal Alto',
      telefono: '322 947 8820',
      ciudad: 'Villavicencio'
    }
  })

  console.log('Consultorio listo:', config.id)

  // Crear o actualizar usuario doctora
  const password_hash = await bcrypt.hash('123456', 10)
  const usuario = await prisma.usuario.upsert({
    where: { email: 'doctora@oralyn.com' },
    update: {},
    create: {
      consultorio_id: config.id,
      email: 'doctora@oralyn.com',
      password_hash,
      nombre: 'Rocío Murillo',
      registro: '3989'
    }
  })

  console.log('Usuario listo:', usuario.email)
  console.log('✅ Seed completado')
>>>>>>> origin/dev
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())