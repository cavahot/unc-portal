// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2): endpoints propios de la colección `users`, en el orden en que
// se registran. Van ANTES que los de Payload (collections/config/sanitize.js:82), por eso los de recuperación cerrada
// reemplazan a `/forgot-password` y `/reset-password` originales.
import { cambiarClaveEndpoint } from './cambiarClave'
import { forgotPasswordClosedEndpoint, resetPasswordClosedEndpoint } from './recuperacionCerrada'
import { restablecerClaveEndpoint } from './restablecerClave'

export const usersEndpoints = [
  cambiarClaveEndpoint,
  restablecerClaveEndpoint,
  forgotPasswordClosedEndpoint,
  resetPasswordClosedEndpoint,
]
