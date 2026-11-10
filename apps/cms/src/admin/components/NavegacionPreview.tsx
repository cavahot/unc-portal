'use client'

// MENU-CMS-03 (S1): vista del menú del portal arriba del formulario de Navegación.
// Qué hace: dibuja el árbol completo (enlaces principales y subenlaces, con su destino) a partir de lo que hay en el
//   formulario, y se actualiza mientras se edita, sin guardar.
// Por qué existe: el pedido fue «visualizar la estructura del portal» antes de insertar en un nivel (p. ej. «Tesis
//   Académicas» dentro de «Academia»). Límite: solo lectura; no consulta títulos de páginas vinculadas.
import React from 'react'
import { useAllFormFields } from '@payloadcms/ui'
import { reduceFieldsToValues } from 'payload/shared'
import { buildNavTree, type NavTreeNode } from '../../utilities/navegacionTree'

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 6px)',
  padding: '16px 20px',
  marginBottom: '24px',
  background: 'var(--theme-elevation-50)',
}
const muted: React.CSSProperties = { color: 'var(--theme-elevation-600)', fontSize: '13px' }

function Item({ node, level }: { node: NavTreeNode; level: 0 | 1 }) {
  return (
    <li style={{ margin: level === 0 ? '10px 0 0' : '4px 0 0' }}>
      <span style={{ fontWeight: level === 0 ? 600 : 400 }}>{node.label}</span>{' '}
      <span style={muted}>— {node.destination}</span>
      {node.children.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, paddingLeft: '20px', borderLeft: '2px solid var(--theme-elevation-150)' }}>
          {node.children.map((child, i) => (
            <Item key={i} node={child} level={1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export const NavegacionPreview: React.FC = () => {
  const [fields] = useAllFormFields()
  const values = reduceFieldsToValues(fields, true) as { links?: unknown }
  const tree = buildNavTree(values.links as never)
  const total = tree.reduce((n, node) => n + 1 + node.children.length, 0)

  return (
    <section style={box} aria-label="Vista del menú del portal">
      <h3 style={{ margin: 0, fontSize: '16px' }}>Vista del menú del portal</h3>
      {tree.length === 0 ? (
        <p style={{ ...muted, margin: '8px 0 0' }}>
          El menú está vacío: el portal muestra su menú de respaldo. Para cargar el menú actual y editarlo aquí, ejecute
          <code> node scripts/seed-navegacion.mjs --apply</code> o agregue los enlaces abajo.
        </p>
      ) : (
        <>
          <p style={{ ...muted, margin: '4px 0 0' }}>
            {tree.length} enlaces principales y {total - tree.length} subenlaces, en el orden del portal. Se actualiza mientras
            edita; los cambios se publican al guardar.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {tree.map((node, i) => (
              <Item key={i} node={node} level={0} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
