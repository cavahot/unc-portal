// SEC-REVIEW: los campos de procedencia de `media` (sha256, sourcePath) no deben leerse sin sesión.
// Amenaza: la colección es de lectura pública (`read: () => true`); sin acceso por campo, REST/GraphQL anónimos
// exponen la huella del original y la ruta del lote de origen (rutas internas del equipo que migró).
// Límite: prueba la función de acceso por campo con un `req` simulado; no ejecuta Payload ni la BD.
import { describe, expect, it } from 'vitest'
import { Media } from '../../apps/cms/src/collections/Media'

type FieldLike = { name?: string; access?: { read?: (args: { req: { user: unknown } }) => unknown } }

const fields = Media.fields as FieldLike[]
const byName = (n: string) => fields.find((f) => f.name === n)
const canRead = (n: string, user: unknown) => {
  const fn = byName(n)?.access?.read
  return fn ? fn({ req: { user } }) : true // sin acceso por campo = público
}

describe.each(['sha256', 'sourcePath'])('Media.%s (procedencia)', (name) => {
  it('anónimo no puede leerlo', () => {
    expect(canRead(name, null)).toBe(false)
  })
  it('rol sin escritura de medios (viewer) no puede leerlo', () => {
    expect(canRead(name, { role: 'viewer' })).toBe(false)
  })
  it('rol con escritura de medios sí puede leerlo', () => {
    expect(canRead(name, { role: 'media-manager' })).toBe(true)
    expect(canRead(name, { role: 'editor' })).toBe(true)
  })
})

describe('Media: el resto de campos sigue público', () => {
  it.each(['alt', 'blurDataURL'])('%s sin restricción por campo', (name) => {
    expect(byName(name)?.access?.read).toBeUndefined()
  })
})
