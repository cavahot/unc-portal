'use client'

// MENU-CMS-06: campo «Dirección (URL)» de Navegación con un combo de secciones del portal que aún no están en el menú.
// Qué hace: dibuja el campo de texto de siempre y, debajo, un selector; al elegir una sección escribe su ruta en la
// dirección y, si el texto del enlace está vacío, también su nombre. La dirección se puede seguir escribiendo a mano.
// Por qué existe: las secciones programadas del portal no son Páginas del CMS y había que conocer la ruta exacta.
// Límite: la lista sale de config/portalSections.ts; no descubre rutas nuevas sola.
import React from 'react'
import { TextField, useAllFormFields, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { reduceFieldsToValues } from 'payload/shared'
import { PORTAL_SECTIONS, applySection, availableSections } from '../../config/portalSections'

export const NavegacionUrlField: TextFieldClientComponent = (props) => {
  const path = props.path
  const labelPath = path.replace(/\.url$/, '.label')
  const { value, setValue } = useField<string>({ path })
  const { value: label, setValue: setLabel } = useField<string>({ path: labelPath })
  const [fields] = useAllFormFields()
  const { links } = reduceFieldsToValues(fields, true) as { links?: never }
  const options = availableSections(links, value)
  const selectId = `${path.replace(/\./g, '-')}-seccion`

  return (
    <div>
      <TextField {...props} />
      {/* Sin margen negativo: subía el bloque sobre la descripción del campo de texto (se solapaban en el panel). */}
      <div style={{ marginTop: '8px', marginBottom: '24px' }}>
        <label htmlFor={selectId} style={{ display: 'block', fontSize: '13px', lineHeight: '18px', color: 'var(--theme-elevation-600)', marginBottom: '6px' }}>
          o elegir una sección del portal que aún no está en el menú
        </label>
        <select
          id={selectId}
          value=""
          onChange={(e) => {
            const section = PORTAL_SECTIONS.find((s) => s.path === e.target.value)
            if (!section) return
            const next = applySection(section, label)
            setValue(next.url)
            if (next.label) setLabel(next.label)
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'var(--theme-input-bg, var(--theme-elevation-50))',
            color: 'var(--theme-text)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s, 4px)',
          }}
        >
          <option value="">{options.length ? `Elegir sección… (${options.length} disponibles)` : 'Todas las secciones ya están en el menú'}</option>
          {options.map((s) => (
            <option key={s.path} value={s.path}>
              {s.label} — {s.path}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
