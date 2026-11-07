// GLO-GN-03: aplicar al catálogo messages/gn las traducciones del documento «UNC-Glosario-Guarani-completado».
// Qué prueba: el plan que decide qué clave del catálogo se completa y cuál se omite.
// Amenazas: (1) escribir en una clave equivocada (la ubicación del documento no corresponde al texto español);
// (2) pisar una traducción ya hecha y revisada en el catálogo; (3) perder los marcadores {…} de una frase;
// (4) alterar el formato del archivo (fin de línea) y ensuciar el diff. Límite: sin red ni disco salvo la
// prueba de formato; la corrección lingüística no se prueba aquí (exige revisión nativa).
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { planCatalog, applyToJson } from '../../scripts/lib/gnCatalogApply.mjs'

const es = {
  common: { academia: 'Academia', skip: 'Ir al contenido' },
  'pages.x': { count: { other: '{count} conceptos' }, nota: 'Texto largo' },
}
// En gn, lo no traducido repite el español (así lo dejó la migración).
const gn = {
  common: { academia: 'Academia', skip: 'Eho tetepy guasúpe' },
  'pages.x': { count: { other: '{count} conceptos' }, nota: 'Texto largo' },
}
const row = (over: Record<string, unknown>) => ({ terminoEs: 'Academia', donde: 'common:academia', terminoGn: 'Ñemoarandu', ...over })

describe('GLO-GN-03 plan del catálogo', () => {
  it('completa la clave cuando el guaraní todavía repite el español y el texto coincide', () => {
    const { updates, skipped } = planCatalog({ rows: [row({})], es, gn })
    expect(updates).toEqual([{ file: 'common', path: 'academia', value: 'Ñemoarandu' }])
    expect(skipped).toEqual([])
  })

  it('NO pisa una clave que ya tiene traducción distinta del español', () => {
    const { updates, skipped } = planCatalog({ rows: [row({ terminoEs: 'Ir al contenido', donde: 'common:skip', terminoGn: 'otra cosa' })], es, gn })
    expect(updates).toEqual([])
    expect(skipped[0].reason).toMatch(/ya traducida/)
  })

  it('omite si el texto español de la clave no coincide con el del documento (ubicación equivocada)', () => {
    const { updates, skipped } = planCatalog({ rows: [row({ terminoEs: 'Otra cosa' })], es, gn })
    expect(updates).toEqual([])
    expect(skipped[0].reason).toMatch(/no coincide/)
  })

  it('omite si la clave no existe en el catálogo', () => {
    const { skipped } = planCatalog({ rows: [row({ donde: 'common:noexiste' })], es, gn })
    expect(skipped[0].reason).toMatch(/no existe/)
  })

  it('omite la traducción que pierde o cambia un marcador {…}', () => {
    const bad = row({ terminoEs: '{count} conceptos', donde: 'pages.x:count.other', terminoGn: '{n} mba’e' })
    const { updates, skipped } = planCatalog({ rows: [bad], es, gn })
    expect(updates).toEqual([])
    expect(skipped[0].reason).toMatch(/marcadores/)
    const good = row({ terminoEs: '{count} conceptos', donde: 'pages.x:count.other', terminoGn: '{count} mba’e rehegua' })
    expect(planCatalog({ rows: [good], es, gn }).updates[0].value).toBe("{count} mba'e rehegua") // puso normalizado
  })

  it('una fila con varias ubicaciones completa cada una', () => {
    const r = row({ donde: 'common:academia, pages.x:nota', terminoEs: 'Academia' })
    const { updates, skipped } = planCatalog({ rows: [r], es, gn })
    expect(updates).toHaveLength(1) // pages.x:nota tiene otro texto español → se omite
    expect(skipped).toHaveLength(1)
  })

  it('omite las filas sin traducción', () => {
    expect(planCatalog({ rows: [row({ terminoGn: '' })], es, gn }).updates).toEqual([])
  })
})

describe('GLO-GN-03 escritura del JSON', () => {
  it('conserva el fin de línea del archivo (CRLF) y el salto final', () => {
    const original = '{\r\n  "a": "uno",\r\n  "b": { "c": "dos" }\r\n}\r\n'
    const out = applyToJson(original, [{ path: 'b.c', value: 'mokõi' }])
    expect(out).toBe('{\r\n  "a": "uno",\r\n  "b": {\r\n    "c": "mokõi"\r\n  }\r\n}\r\n')
  })

  it('con LF deja LF', () => {
    expect(applyToJson('{\n  "a": "uno"\n}\n', [{ path: 'a', value: 'peteĩ' }])).toBe('{\n  "a": "peteĩ"\n}\n')
  })
})
