// SEC-CUENTAS-03 (odd/tasks/seguridad-cuentas.md, S2): reemplazo de la pantalla «Olvidé mi contraseña» del panel.
// Qué hace: explica que la recuperación la realiza un administrador y ofrece volver al ingreso; no tiene formulario.
// Por qué existe: la vista de Payload anuncia «Correo enviado» aunque `POST /api/users/forgot-password` responde 403
//   (endpoints/users/recuperacionCerrada.ts), lo que haría esperar un correo que nunca llega.
// Límite: solo es la pantalla; el cierre real es el endpoint.
import React from 'react'

import { adminPath } from '../../../config/adminRoute'
import { RECOVERY_CLOSED_MESSAGE } from '../../../endpoints/users/recuperacionCerrada'

export function RecuperacionCerradaView() {
  return (
    <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>¿Olvidó su contraseña?</h1>
      <p style={{ marginBottom: '0.5rem' }}>{RECOVERY_CLOSED_MESSAGE}</p>
      <p style={{ marginBottom: '1.5rem', color: 'var(--theme-elevation-600)' }}>
        Pídale que restablezca su contraseña. Recibirá una contraseña provisoria y, al ingresar, deberá elegir una nueva.
      </p>
      <a href={adminPath('/login')}>Volver al inicio de sesión</a>
    </div>
  )
}
