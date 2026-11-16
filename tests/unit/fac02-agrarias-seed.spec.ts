// FAC-02: invariantes de los datos verificados de la Facultad de Ciencias Agrarias (scripts/lib/agrariasSeedData.mjs).
// Amenazas: (1) datos inventados o copiados de otra facultad (la página anterior traía aranceles de Odontología);
// (2) afirmar una acreditación sin fuente ANEAES; (3) enlaces o resoluciones que el CMS rechazaría; (4) filas duplicadas.
// Límite: no compara con el sitio en vivo (se hizo al armar el módulo; ver docs/specs/portal/FACULTAD-AGRARIAS-DATOS.md).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARANCELES, CARRERAS, FACULTAD_FIELDS, FACULTAD_SLUG, SOURCES } from '../../scripts/lib/agrariasSeedData.mjs'
import * as odontologia from '../../scripts/lib/odontologiaSeedData.mjs'
import { validateHttpsUrl, validateRedUrl, validateResolucionEnlace, validateResolucionNumero } from '../../apps/cms/src/utilities/validators'

const ALLOWED_SOURCES = new Set(Object.values(SOURCES))
const GRUPOS = ['multas', 'venta', 'servicios', 'medicos']
const ALL_TEXT = JSON.stringify({ FACULTAD_FIELDS, CARRERAS, ARANCELES })

describe('datos: procedencia y no invención', () => {
  it('slug real de la facultad y fuentes https', () => {
    expect(FACULTAD_SLUG).toBe('facultad-de-ciencias-agrarias')
    for (const s of ALLOWED_SOURCES) expect(validateHttpsUrl(s)).toBe(true)
  })
  it('cada campo, carrera y arancel tiene sourceUrl de la lista de fuentes', () => {
    for (const f of Object.values(FACULTAD_FIELDS)) expect(ALLOWED_SOURCES.has(f.sourceUrl)).toBe(true)
    for (const c of CARRERAS) {
      expect(ALLOWED_SOURCES.has(c.sourceUrl)).toBe(true)
    }
    for (const a of ARANCELES) expect(ALLOWED_SOURCES.has(a.sourceUrl)).toBe(true)
  })
  it('duración y título vienen de S4 (documentada en la spec); sin modalidad ni perfil', () => {
    expect(SOURCES.S4).toBe('https://www.unc.edu.py/tramites/')
    for (const c of CARRERAS) {
      expect(c).not.toHaveProperty('modalidad')
      expect(c).not.toHaveProperty('perfil')
    }
  })
  it('sin placeholders ni acreditación afirmada', () => {
    expect(ALL_TEXT).not.toMatch(/REEMPLAZAR|\bTODO\b|XXX|[Ll]orem|PLACEHOLDER/)
    expect(ALL_TEXT).not.toMatch(/acredit/i)
  })
  it('no copia aranceles de Odontología ni datos de contacto de otra facultad', () => {
    expect(ALL_TEXT).not.toMatch(/Odontolog|founc|Pr[óo]tesis|Usufructo de Cl[ií]nica/i)
    expect(ARANCELES.map((a) => a.concepto)).not.toContain('Multas')
  })
})

describe('carreras', () => {
  it('5 de grado y 3 de posgrado, slugs únicos, nombre+sede únicos', () => {
    expect(CARRERAS.filter((c) => c.tipo === 'grado')).toHaveLength(5)
    expect(CARRERAS.filter((c) => c.tipo === 'posgrado')).toHaveLength(3)
    expect(new Set(CARRERAS.map((c) => c.slug)).size).toBe(CARRERAS.length)
    expect(new Set(CARRERAS.map((c) => `${c.nombre}|${c.sede}`)).size).toBe(CARRERAS.length)
    for (const tipo of ['grado', 'posgrado']) {
      const ordenes = CARRERAS.filter((c) => c.tipo === tipo).map((c) => c.orden)
      expect(new Set(ordenes).size).toBe(ordenes.length)
    }
  })
  it('la rectificación 248/21 va como resolución de Horqueta, no como otra carrera', () => {
    const h = CARRERAS.find((c) => c.slug === 'licenciatura-en-administracion-agropecuaria-horqueta')!
    expect(h.resoluciones.map((r) => r.numero)).toEqual(['557/16', '248/21'])
    expect(h.resoluciones[1].detalle).toBe('Rectificación')
  })
  it('resoluciones: formato, enlace Drive permitido y número único por carrera', () => {
    for (const c of CARRERAS) {
      expect(c.resoluciones.length).toBeGreaterThan(0)
      expect(new Set(c.resoluciones.map((r) => r.numero)).size).toBe(c.resoluciones.length)
      for (const r of c.resoluciones) {
        expect(validateResolucionNumero(r.numero)).toBe(true)
        expect(validateResolucionEnlace(r.enlace)).toBe(true)
        expect(r.enlace).not.toContain('&amp;')
      }
    }
  })
  it('duración dentro de 1-12 años y títulos no vacíos', () => {
    for (const c of CARRERAS) {
      if (c.duracion !== undefined) expect(c.duracion >= 1 && c.duracion <= 12).toBe(true)
      if ('titulo' in c) expect((c.titulo as string).trim().length).toBeGreaterThan(0)
    }
    // La especialización dura 9 meses: no cabe en el campo (mínimo 1 año), por eso no se inventa un valor.
    expect(CARRERAS.find((c) => c.slug.startsWith('especializacion'))).not.toHaveProperty('duracion')
  })
})

describe('facultad', () => {
  it('sitio y redes pasan los validadores; siglas ≤ 12; historia ≤ 2000', () => {
    expect(validateHttpsUrl(FACULTAD_FIELDS.sitioWeb.value)).toBe(true)
    for (const r of FACULTAD_FIELDS.redes.value) expect(validateRedUrl(r.url, { siblingData: { red: r.red } })).toBe(true)
    expect(FACULTAD_FIELDS.siglas.value.length).toBeLessThanOrEqual(12)
    expect(FACULTAD_FIELDS.historia.value.length).toBeLessThanOrEqual(2000)
    expect(FACULTAD_FIELDS.direccion.value.length).toBeLessThanOrEqual(200)
    expect(FACULTAD_FIELDS.correosAdicionales.value.length).toBeLessThanOrEqual(4)
  })
  it('no incluye al decano (vive en `autoridades`)', () => {
    expect(Object.keys(FACULTAD_FIELDS)).not.toContain('decano')
  })
})

describe('aranceles', () => {
  it('31 filas, grupos del CMS, enteros positivos ≤ 100.000.000', () => {
    expect(ARANCELES).toHaveLength(31)
    for (const a of ARANCELES) {
      expect(GRUPOS).toContain(a.grupo)
      expect(Number.isInteger(a.monto) && a.monto > 0 && a.monto <= 100_000_000).toBe(true)
      expect(a.concepto.length).toBeLessThanOrEqual(200)
      expect((a.nota ?? '').length).toBeLessThanOrEqual(300)
    }
  })
  it('clave natural única (grupo + concepto), orden único por grupo, sin conceptos con asterisco sin explicar', () => {
    expect(new Set(ARANCELES.map((a) => `${a.grupo}|${a.concepto}`)).size).toBe(ARANCELES.length)
    for (const g of GRUPOS) {
      const o = ARANCELES.filter((a) => a.grupo === g).map((a) => a.orden)
      expect(new Set(o).size).toBe(o.length)
    }
    for (const a of ARANCELES) expect(a.concepto).not.toMatch(/\(\*+\)/)
  })
})

// Guardia anti-pérdida silenciosa: Payload descarta sin avisar las claves que la colección no define, y el guion de
// siembra cree entonces que el campo sigue vacío (nunca converge). `sourceUrl` es la única clave de procedencia y el
// guion la quita antes de escribir (scripts/seed-facultad.mjs: carreraPayload y filas de aranceles).
// No se importa la config de Payload (arrastra payload.config y exige DATABASE_URI): se leen los `name:` del archivo.
// Límite: incluye también nombres de subcampos (numero, url…); basta para detectar claves que no existen en ningún nivel.
const fieldNames = (file: string) =>
  new Set([...readFileSync(`apps/cms/src/collections/${file}.ts`, 'utf8').matchAll(/name:\s*'(\w+)'/g)].map((m) => m[1]))
type SeedModule = { FACULTAD_FIELDS: Record<string, unknown>; CARRERAS: object[]; ARANCELES: object[] }
describe.each([
  ['agrarias', { FACULTAD_FIELDS, CARRERAS, ARANCELES } as SeedModule],
  ['odontologia', odontologia as unknown as SeedModule],
])('guardia de campos del CMS: %s', (_n, mod) => {
  const strip = (o: object) => Object.keys(o).filter((k) => k !== 'sourceUrl')
  it('toda clave de facultad, carrera y arancel existe en su colección', () => {
    const fac = fieldNames('Facultades')
    const car = fieldNames('Carreras')
    const ara = fieldNames('ArancelesFacultad')
    expect(Object.keys(mod.FACULTAD_FIELDS).filter((k) => !fac.has(k))).toEqual([])
    for (const c of mod.CARRERAS) expect(strip(c).filter((k) => !car.has(k))).toEqual([])
    for (const a of mod.ARANCELES) expect(strip(a).filter((k) => !ara.has(k))).toEqual([])
  })
})
