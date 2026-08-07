#!/usr/bin/env node
/**
 * seed-ciencias-exactas.mjs
 * Seeds Facultad de Ciencias Exactas y Tecnológicas + carreras en Payload CMS.
 *
 * Usage:
 *   $env:CMS_EMAIL = "admin@unc.edu.py"
 *   $env:CMS_PASSWORD = "your-password"
 *   node scripts/seed-ciencias-exactas.mjs
 *
 * Source: https://www.unc.edu.py/facultad-de-ciencias-exactas-y-tecnologicas/
 */

const CMS_URL      = process.env.CMS_URL      || 'http://localhost:3002'
const CMS_EMAIL    = process.env.CMS_EMAIL    || ''
const CMS_PASSWORD = process.env.CMS_PASSWORD || ''

if (!CMS_EMAIL || !CMS_PASSWORD) {
  console.error('ERROR: Set CMS_EMAIL and CMS_PASSWORD environment variables first.')
  process.exit(1)
}

// ── Data ─────────────────────────────────────────────────────────────────────

const FACULTAD = {
  nombre:   'Facultad de Ciencias Exactas y Tecnológicas',
  email:    'academicofacet@unc.edu.py',
  telefono: '(595 331) 243361',
  activa:   true,
}

const CARRERAS_GRADO = [
  {
    nombre:    'Licenciatura en Matemática y Física',
    sede:      'Central/Concepción',
    resolucion: '555/16',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Matemática y Física',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Matemáticas Aplicadas',
    sede:      'Central/Concepción',
    resolucion: '558/16',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Matemáticas Aplicadas',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Ingeniería Civil',
    sede:      'Central/Concepción',
    resolucion: '559/16',
    tipo:      'grado',
    duracion:  5,
    titulo:    'Ingeniero/a Civil',
    modalidad: 'Presencial',
    activa:    true,
  },
]

const PROGRAMAS_POSGRADO = [
  {
    nombre:    'Maestría en Didáctica de las Ciencias',
    sede:      'Central/Concepción',
    resolucion: '464/23',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Didáctica de las Ciencias',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Especialización en Ingeniería Vial',
    sede:      'Central/Concepción',
    resolucion: '409/23',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Ingeniería Vial',
    modalidad: 'Presencial',
    activa:    true,
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

async function findOrCreate(token, collection, query, data, uniqueField) {
  const searchRes = await fetch(`${CMS_URL}/api/${collection}?${query}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  if (!searchRes.ok) throw new Error(`GET /${collection} failed: ${searchRes.status}`)
  const { docs } = await searchRes.json()

  if (docs.length > 0) {
    console.log(`  ⚠  skip  "${data[uniqueField]}" (ya existe, id=${docs[0].id})`)
    return docs[0]
  }

  const createRes = await fetch(`${CMS_URL}/api/${collection}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body:    JSON.stringify(data),
  })
  if (!createRes.ok) {
    const text = await createRes.text()
    throw new Error(`POST /${collection} failed: ${createRes.status} ${text}`)
  }
  const created = await createRes.json()
  const record  = created.doc ?? created
  console.log(`  ✓  creado "${data[uniqueField]}" (id=${record.id})`)
  return record
}

function toSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Conectando a ${CMS_URL}...`)
  const token = await login()
  console.log('✓ Autenticado\n')

  console.log('── Facultad de Ciencias Exactas y Tecnológicas ───────────────')
  const facultadSlug = toSlug(FACULTAD.nombre)
  const facultad = await findOrCreate(
    token,
    'facultades',
    `where[slug][equals]=${facultadSlug}&limit=1`,
    { ...FACULTAD, slug: facultadSlug },
    'nombre',
  )
  const facultadId = facultad.id
  console.log(`\n   Facultad ID: ${facultadId} / slug: ${facultadSlug}`)

  console.log('\n── Carreras de Grado ─────────────────────────────────────────')
  for (const carrera of CARRERAS_GRADO) {
    const slug = toSlug(carrera.nombre)
    await findOrCreate(
      token,
      'carreras',
      `where[slug][equals]=${slug}&limit=1`,
      { ...carrera, slug, facultad: facultadId },
      'nombre',
    )
  }

  console.log('\n── Programas de Posgrado ─────────────────────────────────────')
  for (const programa of PROGRAMAS_POSGRADO) {
    const slug = toSlug(programa.nombre)
    await findOrCreate(
      token,
      'carreras',
      `where[slug][equals]=${slug}&limit=1`,
      { ...programa, slug, facultad: facultadId },
      'nombre',
    )
  }

  console.log('\n✅ Seed de Ciencias Exactas completado.')
  console.log(`\n   Accedé en: http://localhost:3000/es/facultades/ciencias-exactas`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
