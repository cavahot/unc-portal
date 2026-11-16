'use client'

// SEC-CUENTAS-03 (S6): botón y diálogos para que un superadmin restablezca la contraseña de otra cuenta, con la forma de
//   salida de Google Workspace (generar automáticamente o crear, casilla «pedir cambio», resultado con copiar).
// Qué hace: envía POST /api/users/<id>/restablecer-clave y muestra la clave resultante UNA sola vez.
// Por qué existe: la recuperación por correo está cerrada; el administrador entrega la clave a la persona por un canal seguro.
// Límite: la clave solo vive en el estado de React mientras el diálogo de resultado está abierto; «LISTO» la olvida. Nunca
//   se escribe en localStorage, consola ni registros. El permiso real (solo superadmin, no la propia cuenta) lo exige el servidor.
import React, { useEffect, useRef, useState } from 'react'
import { useAuth, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { buildResetBody, canReset, displayName, passwordRows, serverErrors, type CuentaUsuario, type ResetState } from './logic'
import { Checklist, PasswordInput } from './ui'

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }
const card: React.CSSProperties = { background: 'var(--theme-bg, #fff)', color: 'var(--theme-text)', borderRadius: '8px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }
const footer: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 24px 20px' }
const textButton = (color: string, disabled = false): React.CSSProperties => ({ background: 'none', border: 0, padding: '8px 12px', fontWeight: 600, letterSpacing: '.04em', color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 })

/** Marco accesible de un diálogo modal: role=dialog, foco inicial y cierre con Escape. */
function Dialog(props: { titleId: string; header: React.ReactNode; color: string; onEscape?: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div style={overlay}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.titleId}
        onKeyDown={(e) => e.key === 'Escape' && props.onEscape?.()}
        style={card}
      >
        <div id={props.titleId} style={{ background: props.color, color: '#fff', padding: '16px 24px' }}>
          {props.header}
        </div>
        {props.children}
      </div>
    </div>
  )
}

/** Diálogo de resultado: clave oculta con ojo, copiar con confirmación y LISTO (que la olvida). */
export function ResultDialog(props: { nombre: string; clave: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false)
  const [copiada, setCopiada] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(props.clave)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }

  return (
    <Dialog
      titleId="reset-resultado-titulo"
      color="#1e8e3e"
      header={
        <>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>La contraseña se restableció correctamente</div>
          <div style={{ opacity: 0.9 }}>{props.nombre}</div>
        </>
      }
    >
      <div style={{ padding: '24px' }}>
        <div style={{ fontSize: '13px', color: 'var(--theme-elevation-600)', marginBottom: '6px' }}>Contraseña</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '16px' }}>
          <span data-testid="clave">{visible ? props.clave : '••••••••••••••••'}</span>
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} style={textButton('var(--theme-elevation-700)')}>
            {visible ? '🙈' : '👁'}
          </button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--theme-elevation-600)' }}>Esta contraseña se muestra una sola vez. Cópiela antes de cerrar.</p>
        <div role="status" aria-live="polite" style={{ minHeight: '20px', fontSize: '13px', color: 'var(--theme-success-600, #1a7f37)' }}>
          {copiada ? 'Copiada' : ''}
        </div>
      </div>
      <div style={footer}>
        <button type="button" onClick={copiar} style={textButton('#1a73e8')}>
          COPIAR LA CONTRASEÑA
        </button>
        <button type="button" onClick={props.onDone} style={textButton('#1a73e8')}>
          LISTO
        </button>
      </div>
    </Dialog>
  )
}

/** Diálogo de restablecimiento (formulario). Al tener éxito entrega la clave a `onResult`; no la conserva. */
export function ResetDialog(props: {
  nombre: string
  email: string
  userId: string | number
  onClose: () => void
  onResult: (r: { clave: string; nombre: string }) => void
}) {
  const [state, setState] = useState<ResetState>({ modo: 'generar', clave: '', exigirCambio: true })
  const [errores, setErrores] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const valido = canReset(state, props.email) && !enviando

  async function restablecer() {
    if (!valido) return
    setEnviando(true)
    setErrores([])
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(String(props.userId))}/restablecer-clave`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildResetBody(state)),
      })
      const body = (await res.json().catch(() => null)) as { clave?: string; nombre?: string } | null
      if (res.ok && typeof body?.clave === 'string') {
        setState((s) => ({ ...s, clave: '' }))
        props.onResult({ clave: body.clave, nombre: props.nombre })
      } else {
        setErrores(serverErrors(body, 'No se pudo restablecer la contraseña.'))
      }
    } catch {
      setErrores(['No se pudo conectar con el servidor. Intente de nuevo.'])
    } finally {
      setEnviando(false)
    }
  }

  const radio = (modo: ResetState['modo'], titulo: string, ayuda?: string) => (
    <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' }}>
      <input type="radio" name="modo-restablecer" checked={state.modo === modo} onChange={() => setState((s) => ({ ...s, modo }))} style={{ marginTop: '4px' }} />
      <span>
        <span style={{ display: 'block' }}>{titulo}</span>
        {ayuda && <span style={{ display: 'block', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>{ayuda}</span>}
      </span>
    </label>
  )

  return (
    <Dialog
      titleId="reset-titulo"
      color="#1a73e8"
      onEscape={props.onClose}
      header={
        <>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Restablecer la contraseña de</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>{props.nombre}</div>
        </>
      }
    >
      <div style={{ padding: '24px 24px 8px' }}>
        {radio('generar', 'Generar una contraseña automáticamente', 'En el siguiente paso podrás ver y copiar la contraseña')}
        {radio('crear', 'Crear contraseña')}
        {state.modo === 'crear' && (
          <div style={{ marginLeft: '26px' }}>
            <PasswordInput label="Contraseña*" value={state.clave} onChange={(clave) => setState((s) => ({ ...s, clave }))} autoComplete="new-password" describedBy="reglas-reset" />
            <Checklist id="reglas-reset" rows={passwordRows(state.clave, undefined, props.email)} />
          </div>
        )}
        <label style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '8px 0 12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={state.exigirCambio} onChange={(e) => setState((s) => ({ ...s, exigirCambio: e.target.checked }))} />
          <span>Pedirle al usuario que cambie la contraseña cuando acceda</span>
        </label>
        {errores.length > 0 && (
          <div role="alert" style={{ color: 'var(--theme-error-600, #b42318)', fontSize: '13px' }}>
            {errores.map((m) => (
              <p key={m} style={{ margin: '0 0 4px' }}>{m}</p>
            ))}
          </div>
        )}
      </div>
      <div style={footer}>
        <button type="button" onClick={props.onClose} style={textButton('#1a73e8')}>
          CANCELAR
        </button>
        <button type="button" onClick={restablecer} disabled={!valido} title={!valido && state.modo === 'crear' ? 'Cumpla todas las reglas de la contraseña para habilitar el botón.' : undefined} style={textButton('#1a73e8', !valido)}>
          RESTABLECER
        </button>
      </div>
    </Dialog>
  )
}

/** Campo `ui` de la ficha de usuario: visible solo para un superadmin que edita OTRA cuenta ya guardada. */
export const RestablecerClaveField: React.FC = () => {
  const { user } = useAuth()
  const { id } = useDocumentInfo()
  const nombre = useFormFields(([f]) => f?.nombre?.value as string | undefined)
  const apellido = useFormFields(([f]) => f?.apellido?.value as string | undefined)
  const email = useFormFields(([f]) => f?.email?.value as string | undefined)
  const [abierto, setAbierto] = useState(false)
  const [resultado, setResultado] = useState<{ clave: string; nombre: string } | null>(null)
  const actual = (user ?? null) as CuentaUsuario | null

  if (!id || actual?.role !== 'superadmin' || String(actual.id) === String(id)) return null
  const nom = displayName({ nombre, apellido, email })

  return (
    <div style={{ marginBottom: '16px' }}>
      <button type="button" onClick={() => setAbierto(true)} style={{ padding: '8px 14px', border: '1px solid var(--theme-elevation-300)', borderRadius: 'var(--style-radius-s, 4px)', background: 'transparent', color: 'var(--theme-text)', cursor: 'pointer' }}>
        Restablecer contraseña
      </button>
      {abierto && !resultado && (
        <ResetDialog nombre={nom} email={email ?? ''} userId={id} onClose={() => setAbierto(false)} onResult={setResultado} />
      )}
      {resultado && (
        <ResultDialog
          nombre={resultado.nombre}
          clave={resultado.clave}
          onDone={() => {
            // Olvida la clave: ya no queda en memoria del componente.
            setResultado(null)
            setAbierto(false)
            // La ficha abierta todavía muestra la marca y la fecha anteriores; se recarga para mostrar las que fijó el
            // servidor (y para que nadie guarde encima un formulario desactualizado).
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
