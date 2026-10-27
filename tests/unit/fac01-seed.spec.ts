// FAC-01: invariantes de la siembra de Odontología (scripts/seed-odontologia.mjs + scripts/lib/odontologiaSeedData.mjs).
// Amenazas: (1) datos inventados (cifras sin fuente); (2) escribir en un CMS no local; (3) pisar ediciones del PO;
// (4) red en --dry-run; (5) montos o enlaces que el CMS rechazaría.
// Límite: no compara con el sitio publicado en vivo (eso se hizo al armar el módulo; ver la spec §1.1).
import { describe, expect, it, vi } from 'vitest'
import { ARANCELES, CARRERAS, FACULTAD_FIELDS, SOURCES } from '../../scripts/lib/odontologiaSeedData.mjs'
import { emptyFieldsPatch, isLocalCmsUrl, run } from '../../scripts/seed-odontologia.mjs'
import { validateResolucionEnlace, validateResolucionNumero, validateRedUrl, validateHttpsUrl } from '../../apps/cms/src/utilities/validators'

const ALLOWED_SOURCES = new Set(Object.values(SOURCES))

describe('datos: procedencia y no invención', () => {
  it('cada campo, carrera y arancel tiene sourceUrl de la lista de fuentes', () => {
    for (const f of Object.values(FACULTAD_FIELDS)) expect(ALLOWED_SOURCES.has(f.sourceUrl)).toBe(true)
    for (const c of CARRERAS) expect(ALLOWED_SOURCES.has(c.sourceUrl)).toBe(true)
    for (const a of ARANCELES) expect(ALLOWED_SOURCES.has(a.sourceUrl)).toBe(true)
  })
  it('no trae datos sin fuente: duración, título, perfil, modalidad', () => {
    for (const c of CARRERAS) {
      for (const k of ['duracion', 'titulo', 'perfil', 'modalidad']) expect(c).not.toHaveProperty(k)
    }
  })
  it('2 de grado, 6 posgrados, slugs únicos; 497/21 es resolución de Odontología, no otra carrera', () => {
    expect(CARRERAS.filter((c) => c.tipo === 'grado')).toHaveLength(2)
    expect(CARRERAS.filter((c) => c.tipo === 'posgrado')).toHaveLength(6)
    expect(new Set(CARRERAS.map((c) => c.slug)).size).toBe(CARRERAS.length)
    expect(CARRERAS.find((c) => c.slug === 'odontologia')!.resoluciones.map((r) => r.numero)).toEqual(['165/15', '497/21'])
    expect(JSON.stringify(CARRERAS)).not.toMatch(/acredit/i)
  })
  it('resoluciones, sitio y redes pasan los validadores del CMS', () => {
    for (const c of CARRERAS) for (const r of c.resoluciones) {
      expect(validateResolucionNumero(r.numero)).toBe(true)
      expect(validateResolucionEnlace(r.enlace)).toBe(true)
    }
    expect(validateHttpsUrl(FACULTAD_FIELDS.sitioWeb.value)).toBe(true)
    for (const r of FACULTAD_FIELDS.redes.value) expect(validateRedUrl(r.url, { siblingData: { red: r.red } })).toBe(true)
    expect(FACULTAD_FIELDS.siglas.value).toBe('FOUNC')
  })
  it('28 aranceles: enteros positivos, grupos de la fuente, sin duplicados por grupo', () => {
    expect(ARANCELES).toHaveLength(28)
    const count = (g: string) => ARANCELES.filter((a) => a.grupo === g).length
    expect([count('multas'), count('venta'), count('servicios'), count('medicos')]).toEqual([2, 7, 17, 2])
    for (const a of ARANCELES) expect(Number.isInteger(a.monto) && a.monto > 0 && a.monto <= 100_000_000).toBe(true)
    expect(new Set(ARANCELES.map((a) => `${a.grupo}|${a.concepto}`)).size).toBe(28)
  })
})

describe('guion', () => {
  it('--dry-run no usa la red', async () => {
    const fetch = vi.fn()
    const r = await run({ dryRun: true, deps: { fetch, log: () => {}, env: {} } })
    expect(fetch).not.toHaveBeenCalled()
    expect(r.plan).toEqual({ facultadCampos: Object.keys(FACULTAD_FIELDS).length, carreras: 8, aranceles: 28 })
  })
  it('rechaza un CMS remoto sin --allow-remote y uno http con --allow-remote', async () => {
    const fetch = vi.fn()
    const env = { CMS_URL: 'https://cms.unc.edu.py', CMS_PASSWORD: 'una-clave-larga-segura', CMS_EMAIL: 'a@b.py' }
    await expect(run({ deps: { fetch, env, log: () => {} } })).rejects.toThrow(/solo escribe en un CMS local/)
    await expect(run({ allowRemote: true, deps: { fetch, env: { ...env, CMS_URL: 'http://cms.example' }, log: () => {} } })).rejects.toThrow(/https/)
    expect(fetch).not.toHaveBeenCalled()
    expect(isLocalCmsUrl('http://localhost:3002')).toBe(true)
  })
  it('sin CMS_PASSWORD no hace ninguna solicitud', async () => {
    const fetch = vi.fn()
    await expect(run({ deps: { fetch, env: { CMS_EMAIL: 'a@b.py' }, log: () => {} } })).rejects.toThrow(/CMS_PASSWORD/)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('emptyFieldsPatch solo completa vacíos y reporta diferencias', () => {
    const { patch, differs } = emptyFieldsPatch(
      { siglas: 'FO', historia: '', redes: [], telefono: '(595 331) 241680', correos: [{ id: 'x', email: 'a@b.py' }] },
      { siglas: 'FOUNC', historia: 'H', redes: [{ red: 'x', url: 'https://x.com/a' }], telefono: '(595 331) 241680', correos: [{ email: 'a@b.py' }] },
    )
    expect(patch).toEqual({ historia: 'H', redes: [{ red: 'x', url: 'https://x.com/a' }] })
    expect(differs).toEqual(['siglas'])
  })
})
