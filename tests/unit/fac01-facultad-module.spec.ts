// FAC-01: lógica pura de la página de facultad (lib/cms/facultad.ts). Spec docs/specs/portal/FACULTADES.md §2.
// Amenazas: (1) datos de demostración o inactivos publicados como oficiales; (2) enlaces del CMS a hosts ajenos o
// con esquemas peligrosos; (3) montos corruptos; (4) secciones vacías visibles que aparentan información.
// Límite: sin red ni React.
import { describe, expect, it } from 'vitest'
import {
  RED_HOSTS,
  RESOLUCION_HOSTS,
  groupArancelesFacultad,
  mapArancelesFacultad,
  mapCarreras,
  mapFacultad,
  mapsSearchHref,
  telHref,
  visibleSections,
} from '@/lib/cms/facultad'
import { RED_HOSTS as CMS_RED_HOSTS, RESOLUCION_HOSTS as CMS_RES_HOSTS } from '../../apps/cms/src/utilities/validators'

const FAC = {
  id: 6,
  nombre: 'Facultad de Odontología',
  slug: 'facultad-de-odontologia',
  siglas: 'FOUNC',
  descripcion: '  Presentación.  ',
  historia: 'Primer párrafo.\n\nSegundo párrafo.',
  direccion: 'Campus Universitario: Ruta Py05, Km 210.',
  telefono: '(595 331) 241680',
  email: 'decanatofo@unc.edu.py',
  correosAdicionales: [{ email: 'secretariagralfo@unc.edu.py' }, { email: 'no-es-correo' }],
  sitioWeb: 'https://www.founc.edu.py/',
  redes: [
    { red: 'facebook', url: 'https://www.facebook.com/founc.py' },
    { red: 'facebook', url: 'https://evil.example/founc' },
    { red: 'x', url: 'javascript:alert(1)' },
  ],
  logoPath: '/images/facultades/odontologia.png',
  activa: true,
}

describe('mapFacultad', () => {
  it('mapea, recorta, separa párrafos y filtra correos y redes no válidos', () => {
    const f = mapFacultad(FAC)!
    expect(f.nombre).toBe('Facultad de Odontología')
    expect(f.descripcion).toBe('Presentación.')
    expect(f.historia).toEqual(['Primer párrafo.', 'Segundo párrafo.'])
    expect(f.emails).toEqual([{ email: 'decanatofo@unc.edu.py' }, { email: 'secretariagralfo@unc.edu.py' }])
    expect(f.redes).toEqual([{ red: 'facebook', url: 'https://www.facebook.com/founc.py' }])
    expect(f.sitioWeb).toEqual({ href: 'https://www.founc.edu.py/', label: 'www.founc.edu.py' })
    expect(f.logoSrc).toBe('/images/facultades/odontologia.png')
    expect(f.telHref).toBe('tel:+595331241680')
  })
  it('inactiva, sin nombre o forma inesperada -> null', () => {
    expect(mapFacultad({ ...FAC, activa: false })).toBeNull()
    expect(mapFacultad({ ...FAC, nombre: '  ' })).toBeNull()
    expect(mapFacultad(null)).toBeNull()
    expect(mapFacultad('x')).toBeNull()
  })
  it('sitio web http o con otro esquema no se enlaza; logo fuera de la carpeta se descarta', () => {
    const f = mapFacultad({ ...FAC, sitioWeb: 'http://www.founc.edu.py', logoPath: '../../etc/passwd' })!
    expect(f.sitioWeb).toBeUndefined()
    expect(f.logoSrc).toBeUndefined()
  })
  it('campos vacíos quedan sin valor (no se inventan)', () => {
    const f = mapFacultad({ id: 1, nombre: 'X', slug: 'x', activa: true })!
    expect(f).toMatchObject({ historia: [], emails: [], redes: [] })
    expect(f.siglas).toBeUndefined()
    expect(f.descripcion).toBeUndefined()
    expect(f.direccion).toBeUndefined()
  })
})

describe('mapCarreras', () => {
  const rows = [
    { id: 2, nombre: 'Licenciatura en Prótesis Dental', tipo: 'grado', orden: 2, sede: 'Central/Concepción', resoluciones: [{ numero: '709/16', enlace: 'https://drive.google.com/open?id=abc' }] },
    { id: 1, nombre: 'Odontología', tipo: 'grado', orden: 1, resoluciones: [{ numero: '165/15', enlace: 'https://evil.example/x' }, { numero: '497/21', detalle: 'Actualización' }] },
    { id: 3, nombre: 'Especialización en Endodoncia', tipo: 'posgrado', resolucion: '21/16' },
    { id: 4, nombre: 'Inactiva', tipo: 'grado', activa: false },
    { id: 5, nombre: '', tipo: 'grado' },
    { id: 6, nombre: 'Sin tipo válido', tipo: 'otro' },
  ]
  it('separa por tipo, ordena por orden y nombre, descarta inactivas e inválidas', () => {
    const { grado, posgrado } = mapCarreras(rows)
    expect(grado.map((c) => c.nombre)).toEqual(['Odontología', 'Licenciatura en Prótesis Dental'])
    expect(posgrado.map((c) => c.nombre)).toEqual(['Especialización en Endodoncia'])
  })
  it('resoluciones: enlace solo si el host está permitido; cae a `resolucion` obsoleto sin enlace', () => {
    const { grado, posgrado } = mapCarreras(rows)
    expect(grado[0].resoluciones).toEqual([{ numero: '165/15' }, { numero: '497/21', detalle: 'Actualización' }])
    expect(grado[1].resoluciones).toEqual([{ numero: '709/16', href: 'https://drive.google.com/open?id=abc' }])
    expect(posgrado[0].resoluciones).toEqual([{ numero: '21/16' }])
  })
  it('no inventa duración ni título', () => {
    const { grado } = mapCarreras(rows)
    expect(grado[0].duracion).toBeUndefined()
    expect(grado[0].titulo).toBeUndefined()
    expect(mapCarreras('x')).toEqual({ grado: [], posgrado: [] })
  })
})

describe('aranceles de facultad', () => {
  const rows = [
    { id: 1, concepto: 'Multas', monto: 10000, grupo: 'multas', orden: 1 },
    { id: 2, concepto: 'Usufructo de Clínica', monto: 450000, grupo: 'medicos', orden: 1 },
    { id: 3, concepto: 'Decimal', monto: 10.5, grupo: 'venta' },
    { id: 4, concepto: 'Negativo', monto: -1, grupo: 'venta' },
    { id: 5, concepto: 'Grupo raro', monto: 1, grupo: 'otro' },
    { id: 6, concepto: 'Retirado', monto: 1, grupo: 'multas', active: false },
    { id: 7, concepto: 'Constancias Varias', monto: 50000, grupo: 'venta', nota: ' por copia ' },
  ]
  it('descarta filas inválidas o retiradas y agrupa en el orden de la fuente', () => {
    const groups = groupArancelesFacultad(mapArancelesFacultad(rows))
    expect(groups.map((g) => g.grupo)).toEqual(['multas', 'venta', 'medicos'])
    expect(groups[1].items).toEqual([{ id: 7, concepto: 'Constancias Varias', monto: 50000, grupo: 'venta', orden: 99, nota: 'por copia' }])
  })
})

describe('utilidades', () => {
  it('telHref solo con dígitos; vacío sin dígitos suficientes', () => {
    expect(telHref('(595 331) 241680')).toBe('tel:+595331241680')
    expect(telHref('0331 241680')).toBe('tel:0331241680')
    expect(telHref('abc')).toBeUndefined()
  })
  it('mapsSearchHref codifica la dirección y apunta a OpenStreetMap', () => {
    const href = mapsSearchHref('Ruta Py05, Km 210')!
    expect(href.startsWith('https://www.openstreetmap.org/search?query=')).toBe(true)
    expect(href).toContain(encodeURIComponent('Ruta Py05, Km 210, Concepción, Paraguay'))
    expect(mapsSearchHref(undefined)).toBeUndefined()
  })
  it('las listas de hosts coinciden con las del CMS', () => {
    expect([...RESOLUCION_HOSTS]).toEqual([...CMS_RES_HOSTS])
    expect(RED_HOSTS).toEqual(CMS_RED_HOSTS)
  })
  it('visibleSections solo lista secciones con contenido (carreras siempre)', () => {
    expect(visibleSections({ presentacion: false, posgrado: false, decanato: true, acreditacion: false, aranceles: false, contacto: true })).toEqual([
      'grado',
      'decanato',
      'contacto',
    ])
    expect(visibleSections({ presentacion: true, posgrado: true, decanato: false, acreditacion: true, aranceles: true, contacto: false })).toEqual([
      'presentacion',
      'grado',
      'posgrado',
      'acreditacion',
      'aranceles',
    ])
  })
})
