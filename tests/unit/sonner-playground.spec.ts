// PROTO-SONNER-01: contrato del playground visual de notificaciones.
// Qué hace: verifica que la prueba incluya estados informativos y acciones de confirmación.
// Amenaza: evita aprobar una integración que solo muestre un toast de éxito y no cubra errores.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const component = readFileSync('components/prototypes/SonnerPlayground.tsx', 'utf8')
const route = readFileSync('app/[locale]/prototipos/sonner/page.tsx', 'utf8')

describe('PROTO-SONNER-01 — playground de notificaciones', () => {
  it('mantiene la prueba aislada y no indexable', () => {
    expect(route).toContain('robots: { index: false, follow: false }')
    expect(route).toContain('SonnerPlayground')
  })

  it('cubre estados y confirmación destructiva', () => {
    for (const token of ['toast.success', 'toast.error', 'toast.info', 'toast.warning', 'toast.promise', 'action:', 'cancel:']) {
      expect(component).toContain(token)
    }
    expect(component).toContain('sonner-unc-toast')
    expect(component).toContain('sonner-demo-button')
  })
})
