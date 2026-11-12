'use client'

// SEC-CUENTAS-03 (S1, S3): vista /cambiar-clave del panel para que la persona cambie su propia contraseña.
// Qué hace: pide la actual, la nueva y su confirmación; muestra la guía de checks en vivo y envía
//   POST /api/users/cambiar-clave. El botón solo se habilita con todas las reglas cumplidas y explica por qué no.
// Por qué existe: es la única pantalla que puede usar una cuenta con cambio obligatorio.
// Límite: la validación real y el cierre de otras sesiones los hace el servidor; nunca se guarda ni se registra la clave.
import React, { useState } from 'react'
import { useAuth } from '@payloadcms/ui'
import { adminPath } from '../../../config/adminRoute'
import { buildChangeBody, canChange, changeDisabledReason, changeReason, passwordRows, serverErrors, type CuentaUsuario } from './logic'
import { Checklist, PasswordInput } from './ui'

export const CambiarClaveView: React.FC = () => {
  const { user } = useAuth()
  const cuenta = (user ?? null) as CuentaUsuario | null
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)
  const email = cuenta?.email ?? ''
  const motivo = canChange(actual, nueva, confirmar, email) ? null : changeDisabledReason(actual, nueva, confirmar, email)
  const bloqueado = Boolean(motivo) || enviando

  // Envía el cambio; en éxito recarga el inicio del panel para releer el estado de la cuenta.
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueado) return
    setEnviando(true)
    setErrores([])
    try {
      const res = await fetch('/api/users/cambiar-clave', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildChangeBody(actual, nueva)),
      })
      const body = await res.json().catch(() => null)
      if (res.ok) {
        setListo(true)
        setActual('')
        setNueva('')
        setConfirmar('')
        setTimeout(() => window.location.assign(adminPath()), 1200)
      } else {
        setErrores(serverErrors(body, res.status === 401 ? 'La contraseña actual no es correcta.' : 'No se pudo cambiar la contraseña.'))
      }
    } catch {
      setErrores(['No se pudo conectar con el servidor. Intente de nuevo.'])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main style={{ maxWidth: '520px', margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: '8px' }}>Cambie su contraseña</h1>
      <p style={{ marginBottom: '24px', color: 'var(--theme-elevation-700)' }}>{changeReason(cuenta)}</p>
      <form onSubmit={enviar} noValidate>
        <PasswordInput label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" />
        <PasswordInput label="Contraseña nueva" value={nueva} onChange={setNueva} autoComplete="new-password" describedBy="reglas-clave" />
        <PasswordInput label="Confirmar contraseña nueva" value={confirmar} onChange={setConfirmar} autoComplete="new-password" />
        <Checklist id="reglas-clave" rows={passwordRows(nueva, confirmar, email)} />
        {errores.length > 0 && (
          <div role="alert" style={{ color: 'var(--theme-error-600, #b42318)', marginBottom: '16px' }}>
            {errores.map((m) => (
              <p key={m} style={{ margin: 0 }}>{m}</p>
            ))}
          </div>
        )}
        {listo && (
          <p role="status" style={{ color: 'var(--theme-success-600, #1a7f37)' }}>
            Su contraseña se cambió correctamente. Redirigiendo…
          </p>
        )}
        <button
          type="submit"
          disabled={bloqueado}
          aria-describedby="motivo-deshabilitado"
          style={{ padding: '10px 20px', border: 0, borderRadius: 'var(--style-radius-s, 4px)', background: 'var(--theme-elevation-800)', color: 'var(--theme-elevation-0)', cursor: bloqueado ? 'not-allowed' : 'pointer', opacity: bloqueado ? 0.5 : 1 }}
        >
          {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
        <p id="motivo-deshabilitado" style={{ fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
          {motivo ?? ''}
        </p>
      </form>
      <p>
        <a href={adminPath('/logout')}>Cerrar sesión</a>
      </p>
    </main>
  )
}
