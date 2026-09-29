const test = require('node:test')
const assert = require('node:assert/strict')
const { enviarConfirmacionCita, enviarRecordatorioCita, enviarCorreoRecuperacion } = require('../../src/services/email.service')

test('Email Service: simulación en desarrollo cuando no hay RESEND_API_KEY', async () => {
  // Sin RESEND_API_KEY configurado
  const resRecuperacion = await enviarCorreoRecuperacion('test@example.com', 'Test User', 'http://localhost/reset')
  assert.equal(resRecuperacion.id, 'dev-simulated-email')

  const resConfirmacion = await enviarConfirmacionCita({
    email: 'paciente@example.com',
    nombrePaciente: 'Carlos Pérez',
    fechaHora: new Date('2026-10-15T10:00:00Z'),
    nombreConsultorio: 'Oralyn Central',
    profesional: 'Dr. Roberto Gómez'
  })
  assert.equal(resConfirmacion.id, 'dev-simulated-email')

  const resRecordatorio = await enviarRecordatorioCita({
    email: 'paciente@example.com',
    nombrePaciente: 'Carlos Pérez',
    fechaHora: new Date('2026-10-15T10:00:00Z'),
    nombreConsultorio: 'Oralyn Central',
    profesional: 'Dr. Roberto Gómez'
  })
  assert.equal(resRecordatorio.id, 'dev-simulated-email')
})
