#!/usr/bin/env node
/**
 * seed-tribunal.mjs
 * Seeds TribunalMiembros and TribunalDocumentos collections in Payload CMS.
 *
 * Uso (local por defecto; remoto solo https y con --allow-remote):
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-tribunal.mjs
 *   CMS_URL=https://cms.unc.edu.py CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-tribunal.mjs --allow-remote
 *
 * Idempotente: cada miembro (por nombre) y documento (por título) que ya existe se omite; nunca se modifica.
 * SEED-PROD B4: misma guardia que el resto de las siembras (`resolveCmsTarget`, `requireCmsEmail`,
 * `requireCmsPassword`). Amenaza que evita: enviar credenciales a un host equivocado o con una clave débil.
 */
import { requireCmsEmail, resolveCmsTarget } from './lib/cmsTarget.mjs'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'

let CMS_URL, CMS_EMAIL, CMS_PASSWORD
try {
  CMS_URL = resolveCmsTarget({ url: process.env.CMS_URL || 'http://localhost:3002', allowRemote: process.argv.includes('--allow-remote') })
  CMS_EMAIL = requireCmsEmail()
  CMS_PASSWORD = requireCmsPassword()
} catch (err) {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
}

// ── Data ─────────────────────────────────────────────────────────────────────

const MIEMBROS = [
  { nombre: 'Abg. Nadia Carolina Argüello Aguilar', cargo: 'Presidente',      orden: 1, active: true },
  { nombre: 'Abg. Felix Ramón Lezcano Antúnez',     cargo: 'Vicepresidente',  orden: 2, active: true },
  { nombre: 'Mg. Jorge Raúl Marín Cuevas',          cargo: 'Miembro Titular', orden: 3, active: true },
  { nombre: 'Mg. Leticia María López Paez',          cargo: 'Secretaria',      orden: 4, active: true },
  { nombre: 'Mg. Oscar David Franco Díaz',           cargo: 'Ujier',           orden: 5, active: true },
]

const DOCUMENTOS = [
  {
    titulo: 'Cronograma Electoral 2026',
    tipo:   'principal-cronograma',
    driveUrl: '',
    orden:  1,
    active: true,
  },
  {
    titulo: 'Reglamento Electoral',
    tipo:   'principal-reglamento',
    driveUrl: '',
    orden:  2,
    active: true,
  },
  {
    titulo: 'Lista de Inscriptos',
    tipo:   'lista-inscriptos',
    orden:  3,
    active: true,
  },
  {
    titulo: 'Formato de Notas',
    tipo:   'formato-notas',
    orden:  4,
    active: true,
  },
  {
    titulo: 'Oficialización de Padrón Electoral',
    tipo:   'padron-electoral',
    orden:  5,
    active: true,
  },
  {
    titulo: 'Puesta de Manifiesto de Movimientos y Candidaturas',
    tipo:   'candidaturas',
    orden:  6,
    active: true,
  },
  {
    titulo: 'Oficialización de Candidaturas',
    tipo:   'oficializacion',
    orden:  7,
    active: true,
  },
  {
    titulo: 'Proclamación de Candidatos',
    tipo:   'proclamacion',
    orden:  8,
    active: true,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  const { token } = await res.json()
  return token
}

async function getExisting(token, slug, field) {
  const res = await fetch(`${CMS_URL}/api/${slug}?limit=200`, {
    headers: { Authorization: `JWT ${token}` },
  })
  if (!res.ok) throw new Error(`GET /${slug} failed: ${res.status}`)
  const { docs } = await res.json()
  return new Set(docs.map(d => d[field]))
}

async function create(token, slug, data) {
  const res = await fetch(`${CMS_URL}/api/${slug}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body:    JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST /${slug} failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function seedCollection(token, slug, records, uniqueField, label) {
  console.log(`\n── ${label} ─────────────────────────────`)
  const existing = await getExisting(token, slug, uniqueField)

  for (const record of records) {
    const key = record[uniqueField]
    if (existing.has(key)) {
      console.log(`  ⚠  skip  "${key}" (ya existe)`)
      continue
    }
    try {
      await create(token, slug, record)
      console.log(`  ✓  creado "${key}"`)
    } catch (err) {
      console.error(`  ✗  error  "${key}": ${err.message}`)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Conectando a ${CMS_URL}...`)
  const token = await login()
  console.log('✓ Autenticado')

  await seedCollection(token, 'tribunal-miembros',   MIEMBROS,   'nombre', 'Miembros del Tribunal')
  await seedCollection(token, 'tribunal-documentos', DOCUMENTOS, 'titulo', 'Documentos del Tribunal')

  console.log('\n✅ Seed completado.')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
