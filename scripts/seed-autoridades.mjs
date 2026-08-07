/**
 * Seed script — Autoridades institucionales
 * Source: https://www.unc.edu.py/autoridades/
 *
 * Usage:
 *   $env:CMS_EMAIL="admin@unc.edu.py"; $env:CMS_PASSWORD="yourPassword"
 *   node scripts/seed-autoridades.mjs
 */

const CMS_URL = 'http://localhost:3002'
const CMS_EMAIL = process.env.CMS_EMAIL || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || ''

const AUTHORITIES = [
  // ── Rectorado ────────────────────────────────────────────────────────────
  {
    name: 'Prof. Dr. Clarito Rojas Marín',
    role: 'Rector',
    type: 'rector',
    bio: 'Autoridad máxima de la Universidad Nacional de Concepción. Representa a la institución ante organismos nacionales e internacionales.',
    order: 1,
  },
  {
    name: 'Prof. Dr. Arnaldo Miguel Ferreira Cabañas',
    role: 'Vicerrector',
    type: 'vicerrector',
    bio: 'Apoya y complementa la gestión rectoral en la conducción académica e institucional de la universidad.',
    order: 2,
  },

  // ── Decanos ──────────────────────────────────────────────────────────────
  {
    name: 'Prof. Dr. Carlos Ramón Lima De León',
    role: 'Decano',
    type: 'decano',
    faculty: 'Facultad de Odontología',
    order: 10,
  },
  {
    name: 'Prof. Ing. Agr. Derlys Fernando López Avalos',
    role: 'Decano',
    type: 'decano',
    faculty: 'Facultad de Ciencias Agrarias',
    order: 11,
  },
  {
    name: 'Prof. Mg. Gerardo Lang Ferri',
    role: 'Decano',
    type: 'decano',
    faculty: 'Facultad de Ciencias Económicas y Administrativas',
    order: 12,
  },
  {
    name: 'Prof. Dr. Roberto Gustavo Barrios',
    role: 'Decano',
    type: 'decano',
    faculty: 'Facultad de Medicina',
    order: 13,
  },
  {
    name: 'Prof. Dra. María Concepción Araujo De Benítez',
    role: 'Decana',
    type: 'decano',
    faculty: 'Facultad de Humanidades y Ciencias de la Educación',
    order: 14,
  },
  {
    name: 'Prof. Dr. Jorge Daniel Mello Román',
    role: 'Decano',
    type: 'decano',
    faculty: 'Facultad de Ciencias Exactas y Tecnológica',
    order: 15,
  },
]

// ── Auth ────────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.token
}

async function createAuthority(token, authority) {
  const res = await fetch(`${CMS_URL}/api/autoridades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ ...authority, active: true }),
  })
  if (!res.ok) throw new Error(`POST failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── SEED AUTORIDADES ──────────────────────────────────────')
  console.log(`   CMS: ${CMS_URL}`)
  console.log(`   Autoridades: ${AUTHORITIES.length}`)

  if (!CMS_PASSWORD) {
    console.error('\n❌  Falta CMS_PASSWORD')
    console.error('   $env:CMS_EMAIL="tu@email.com"; $env:CMS_PASSWORD="tu_pass"')
    console.error('   node scripts/seed-autoridades.mjs')
    process.exit(1)
  }

  let token
  try {
    token = await getToken()
    console.log('✅  Auth OK\n')
  } catch (err) {
    console.error(`❌  ${err.message}`)
    process.exit(1)
  }

  let ok = 0
  let fail = 0

  for (const authority of AUTHORITIES) {
    process.stdout.write(`   [${authority.type}] ${authority.name}... `)
    try {
      await createAuthority(token, authority)
      console.log('✅')
      ok++
    } catch (err) {
      console.log(`❌  ${err.message}`)
      fail++
    }
  }

  console.log('\n──────────────────────────────────────────────────────────')
  console.log(`   Resultado: ${ok} creados · ${fail} errores`)
  if (ok > 0) {
    console.log(`   Recargá el CMS en ${CMS_URL}/admin/collections/autoridades`)
    console.log(`   Portal: http://localhost:3001/autoridades`)
  }
  console.log()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
