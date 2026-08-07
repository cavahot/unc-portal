#!/usr/bin/env node
/**
 * seed-agrarias.mjs
 * Seeds Facultad de Ciencias Agrarias + carreras de grado y posgrado en Payload CMS.
 *
 * Usage:
 *   $env:CMS_EMAIL = "admin@unc.edu.py"
 *   $env:CMS_PASSWORD = "your-password"
 *   node scripts/seed-agrarias.mjs
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
  nombre:   'Facultad de Ciencias Agrarias',
  // slug auto-generated → 'facultad-de-ciencias-agrarias'
  email:    'secgralfcaunc@gmail.com',
  telefono: '(595 331) 241813',
  activa:   true,
}

const CARRERAS_GRADO = [
  {
    nombre:    'Ingeniería Agronómica',
    sede:      'Central/Concepción',
    resolucion: '556/16',
    tipo:      'grado',
    duracion:  5,
    titulo:    'Ingeniero/a Agrónomo/a',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Administración Agropecuaria (Horqueta)',
    sede:      'Horqueta',
    resolucion: '557/16',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Administración Agropecuaria',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Administración de Agronegocios',
    sede:      'Central/Concepción',
    resolucion: '563/16',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Administración de Agronegocios',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Administración Agropecuaria (Fuerte Olimpo)',
    sede:      'Fuerte Olimpo',
    resolucion: '372/21',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Administración Agropecuaria',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Administración Agropecuaria (Yby Yau)',
    sede:      'Yby Yau',
    resolucion: '375/21',
    tipo:      'grado',
    duracion:  4,
    titulo:    'Licenciado/a en Administración Agropecuaria',
    modalidad: 'Presencial',
    activa:    true,
  },
]

const PROGRAMAS_POSGRADO = [
  {
    nombre:    'Maestría en Producción Vegetal',
    sede:      'Central/Concepción',
    resolucion: '562/16',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Producción Vegetal',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Maestría en Zootecnia',
    sede:      'Concepción',
    resolucion: '992/19',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Zootecnia',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Especialización en Fertilidad del Suelo y Nutrición de Plantas',
    sede:      'Central/Concepción',
    resolucion: '553/22',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Fertilidad del Suelo y Nutrición de Plantas',
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
  console.log('── Facultad de Ciencias Agrarias ─────────────────────────')
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
  console.log('\n── Carreras de Grado ─────────────────────────────────────')
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
  console.log('\n── Programas de Posgrado ─────────────────────────────────')
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

  console.log('\n✅ Seed de Ciencias Agrarias completado.')
  console.log(`\n   Accedé en: http://localhost:3001/es/facultades/agrarias`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
