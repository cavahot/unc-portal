'use client'

// SEC-CUENTAS-03: piezas visuales compartidas por la vista de cambio y el diálogo de restablecimiento (S3, S6).
// Qué hace: campo de contraseña con ojo para mostrar/ocultar y lista de checks con aria-live.
// Por qué existe: ambas pantallas muestran la misma guía; así no se duplica el marcado.
// Límite: solo presentación; las reglas vienen de logic.ts / passwordPolicy.ts.
import React, { useId, useState } from 'react'
import type { PasswordRuleResult } from '../../../config/passwordPolicy'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 40px 8px 10px',
  background: 'var(--theme-input-bg, var(--theme-elevation-50))',
  color: 'var(--theme-text)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-s, 4px)',
  boxSizing: 'border-box',
}

/** Campo de contraseña con etiqueta asociada y botón de ojo. Límite: el valor vive solo en el estado del padre. */
export function PasswordInput(props: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  describedBy?: string
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--theme-elevation-800)' }}>
        {props.label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={props.value}
          autoComplete={props.autoComplete}
          aria-describedby={props.describedBy}
          onChange={(e) => props.onChange(e.target.value)}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: 'var(--theme-elevation-600)', padding: '4px', fontSize: '16px' }}
        >
          {visible ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )
}

/** Lista de reglas con un check que se vuelve verde al cumplirse; anuncia los cambios a lectores de pantalla. */
export function Checklist(props: { rows: PasswordRuleResult[] | Array<{ id: string; label: string; ok: boolean }>; id?: string }) {
  return (
    <ul id={props.id} aria-live="polite" aria-label="Reglas de la contraseña" style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, fontSize: '13px' }}>
      {props.rows.map((r) => (
        <li key={r.id} data-ok={r.ok} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', color: r.ok ? 'var(--theme-success-600, #1a7f37)' : 'var(--theme-elevation-600)' }}>
          <span aria-hidden="true" style={{ fontWeight: 700, width: '16px' }}>
            {r.ok ? '✓' : '○'}
          </span>
          <span>
            {r.label}
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{r.ok ? ' (cumplida)' : ' (pendiente)'}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
