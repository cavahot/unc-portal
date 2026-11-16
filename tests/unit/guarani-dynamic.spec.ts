// GLO-GN-DYN-01: contrato del puente entre el glosario aprobado del CMS y messages/gn.
// Qué hace: asegura que solo se reemplacen etiquetas exactas que siguen iguales al español.
// Amenaza: evita traducir frases completas por sustitución de palabras y evita tocar contenido editorial ya revisado.
import { describe, expect, it } from 'vitest'
import { applyApprovedGuaraniDictionary } from '@/lib/i18n/guaraniDynamic'

describe('GLO-GN-DYN-01 — traducción dinámica segura', () => {
  it('actualiza una etiqueta exacta desde el diccionario aprobado', () => {
    const es = { nav: { search: 'Buscar', description: 'Buscar en el portal institucional' } }
    const gn = { nav: { search: 'Buscar', description: 'Eheka portal institucional-pe' } }
    const result = applyApprovedGuaraniDictionary(gn, es, [{ terminoEs: 'Buscar', terminoGn: 'Eheka' }])
    expect(result).toEqual({ nav: { search: 'Eheka', description: 'Eheka portal institucional-pe' } })
  })

  it('no modifica frases ya traducidas ni acepta glosas vacías', () => {
    const es = { nav: { search: 'Buscar', description: 'Buscar en el portal institucional' } }
    const gn = { nav: { search: 'Buscar', description: 'Eheka portal institucional-pe' } }
    const result = applyApprovedGuaraniDictionary(gn, es, [
      { terminoEs: 'Buscar en el portal institucional', terminoGn: '' },
    ])
    expect(result).toEqual(gn)
  })
})
