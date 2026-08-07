#!/usr/bin/env node
/**
 * seed-ciencias-economicas.mjs
 * Seeds Facultad de Ciencias Económicas y Administrativas + carreras en Payload CMS.
 *
 * Usage:
 *   $env:CMS_EMAIL = "admin@unc.edu.py"
 *   $env:CMS_PASSWORD = "your-password"
 *   node scripts/seed-ciencias-economicas.mjs
 *
 * Sources:
 *   https://www.unc.edu.py/facultad-de-ciencias-economicas-y-administrativas/
 *   https://www.fcea-unc.edu.py
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
  nombre:   'Facultad de Ciencias Económicas y Administrativas',
  email:    'secretariageneral@fcea-unc.edu.py',
  telefono: '(595 331) 241749',
  activa:   true,
}

const CARRERAS_GRADO = [
  {
    nombre:    'Ingeniería Comercial',
    sede:      'Concepción',
    resolucion: null,
    tipo:      'grado',
    duracion:  5,
    titulo:    'Ingeniero/a Comercial',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Ingeniería en Informática Empresarial',
    sede:      'Concepción',
    resolucion: null,
    tipo:      'grado',
    duracion:  5,
    titulo:    'Ingeniero/a en Informática Empresarial',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Licenciatura en Administración',
    sede:      'Central/Horqueta',
    resolucion: null,
    tipo:      'grado',
    duracion:  5,
    titulo:    'Licenciado/a en Administración',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Contaduría Pública',
    sede:      'Central/Horqueta',
    resolucion: null,
    tipo:      'grado',
    duracion:  5,
    titulo:    'Contador/a Público/a',
    modalidad: 'Presencial',
    activa:    true,
  },
]

const PROGRAMAS_POSGRADO = [
  {
    nombre:    'Especialización en Administración Financiera Gubernamental',
    sede:      'Central/Concepción',
    resolucion: '518/16',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Administración Financiera Gubernamental',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Maestría en Administración y Dirección de Empresas',
    sede:      'Central/Concepción',
    resolucion: '561/16',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Administración y Dirección de Empresas',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Maestría en Auditoría',
    sede:      'Central/Concepción',
    resolucion: '564/16',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Auditoría',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Especialización en Auditoría Impositiva',
    sede:      'Horqueta',
    resolucion: '528/17',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Auditoría Impositiva',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Maestría en Analítica de Datos en el Área Empresarial',
    sede:      'Concepción',
    resolucion: '136/21',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Analítica de Datos en el Área Empresarial',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Maestría en Contabilidad y Finanzas',
    sede:      'Central/Concepción',
    resolucion: '348/22',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Magíster en Contabilidad y Finanzas',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Especialización en Dirección y Gestión de Mipymes',
    sede:      'Central/Concepción',
    resolucion: '100/24',
    tipo:      'posgrado',
    duracion:  2,
    titulo:    'Especialista en Dirección y Gestión de Mipymes',
    modalidad: 'Presencial',
    activa:    true,
  },
  {
    nombre:    'Doctorado en Administración y Dirección de Empresas',
    sede:      'Central/Concepción',
    resolucion: '101/24',
    tipo:      'posgrado',
    duracion:  4,
    titulo:    'Doctor/a en Administración y Dirección de Empresas',
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

  console.log('── Facultad de Ciencias Económicas y Administrativas ─────────')
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
    const data = { ...carrera, slug, facultad: facultadId }
    if (!data.resolucion) delete data.resolucion
    await findOrCreate(
      token,
      'carreras',
      `where[slug][equals]=${slug}&limit=1`,
      data,
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

  console.log('\n✅ Seed de Ciencias Económicas completado.')
  console.log(`\n   Accedé en: http://localhost:3000/es/facultades/ciencias-economicas`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
