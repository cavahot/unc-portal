#!/usr/bin/env node
/**
 * seed-humanidades.mjs
 * Seeds Facultad de Humanidades y Ciencias de la Educación + carreras en Payload CMS.
 *
 * Usage:
 *   $env:CMS_EMAIL = "admin@unc.edu.py"
 *   $env:CMS_PASSWORD = "your-password"
 *   node scripts/seed-humanidades.mjs
 *
 * Source: https://www.unc.edu.py/facultad-de-humanidades-y-ciencias-de-la-educacion/
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
  nombre:   'Facultad de Humanidades y Ciencias de la Educación',
  // slug auto-generated → 'facultad-de-humanidades-y-ciencias-de-la-educacion'
  email:    'secgral@fhyce.edu.py',
  telefono: '(595 331) 243176',
  activa:   true,
}

const CARRERAS_GRADO = [
  {
    nombre:    'Licenciatura en Ciencias de la Educación',
    sede:      'Central/Concepción',
    resolucion: '156/15',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Ciencias de la Educación',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Psicopedagogía',
    sede:      'Central/Concepción',
    resolucion: '162/15',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Psicopedagogía',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Interculturalidad',
    sede:      'Central/Concepción',
    resolucion: '263/16',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Interculturalidad',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Trabajo Social',
    sede:      'Central/Concepción',
    resolucion: '560/16',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Trabajo Social',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Ciencias de la Comunicación Social',
    sede:      'Concepción',
    resolucion: '710/17',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Ciencias de la Comunicación Social',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Psicología',
    sede:      'Concepción',
    resolucion: '137/21',
    tipo:      'grado',
    duracion:  5,
    titulo:    'Licenciado/a en Psicología',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Educación de la Lengua y Literatura Castellana',
    sede:      'Central/Concepción',
    resolucion: '36/2024',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Educación de la Lengua y Literatura Castellana',
    modalidad: 'Presencial',
    activa:    true,
  },
]

const PROGRAMAS_POSGRADO = [
  {
    nombre:    'Especialización en Investigación Científica',
    sede:      'Central/Concepción',
    resolucion: '284/16',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Investigación Científica',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Especialización en Mediación de Conflictos',
    sede:      'Central/Concepción',
    resolucion: '443/22',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Mediación de Conflictos',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Maestría en Educación Indígena e Intercultural',
    sede:      'Central/Concepción',
    resolucion: '96/23',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Educación Indígena e Intercultural',
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

  // 1. Facultad
  console.log('── Facultad de Humanidades y Ciencias de la Educación ────────')
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

  // 2. Carreras de Grado
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

  // 3. Programas de Posgrado
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

  console.log('\n✅ Seed de Humanidades completado.')
  console.log(`\n   Accedé en: http://localhost:3000/es/facultades/humanidades`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
