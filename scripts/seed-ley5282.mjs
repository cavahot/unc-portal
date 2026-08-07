/**
 * Seed script — Ley 5282/2014
 * Carga los 17 artículos requeridos (Art. 8°) con período 2024 y link de Drive placeholder.
 *
 * Usage:
 *   $env:CMS_EMAIL="admin@unc.edu.py"; $env:CMS_PASSWORD="tu_password"
 *   node scripts/seed-ley5282.mjs
 */

const CMS_URL = 'http://localhost:3002'
const CMS_EMAIL = process.env.CMS_EMAIL || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || ''

const PLACEHOLDER_DRIVE = 'https://drive.google.com/drive/folders/REEMPLAZAR'

const DOCUMENTS = [
  { category: 'item-1',  period: '2024', description: 'Su estructura orgánica' },
  { category: 'item-2',  period: '2024', description: 'Facultades, deberes, funciones y/o atribuciones de sus órganos y dependencias internas' },
  { category: 'item-3',  period: '2024', description: 'Marco normativo que rija su funcionamiento' },
  { category: 'item-4',  period: '2024', description: 'Descripción general de cómo funciona y proceso de toma de decisiones' },
  { category: 'item-5',  period: '2024', description: 'Listado actualizado de todas las personas que cumplan una función pública' },
  { category: 'item-6',  period: '2024', description: 'Descripción de la política institucional y de los planes de acción' },
  { category: 'item-7',  period: '2024', description: 'Descripción de los programas institucionales en ejecución' },
  { category: 'item-8',  period: '2024', description: 'Informes de auditoría' },
  { category: 'item-9',  period: '2024', description: 'Informes de los viajes oficiales realizados dentro del territorio o al extranjero' },
  { category: 'item-10', period: '2024', description: 'Convenios y contratos celebrados' },
  { category: 'item-11', period: '2024', description: 'Cartas oficiales' },
  { category: 'item-12', period: '2024', description: 'Informes finales de consultorías' },
  { category: 'item-13', period: '2024', description: 'Cuadros de resultados' },
  { category: 'item-14', period: '2024', description: 'Lista de poderes vigentes otorgados a abogados' },
  { category: 'item-15', period: '2024', description: 'Sistema de mantenimiento, clasificación e índice de los documentos existentes' },
  { category: 'item-16', period: '2024', description: 'Procedimientos para que personas interesadas puedan acceder a documentos' },
  { category: 'item-17', period: '2024', description: 'Mecanismos de participación ciudadana' },
]

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed (${res.status}): ${await res.text()}`)
  return (await res.json()).token
}

async function createDoc(token, doc, order) {
  const res = await fetch(`${CMS_URL}/api/ley5282`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ ...doc, driveUrl: PLACEHOLDER_DRIVE, active: true, order }),
  })
  if (!res.ok) throw new Error(`POST failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── SEED LEY 5282/2014 ────────────────────────────────────')
  console.log(`   CMS:       ${CMS_URL}`)
  console.log(`   Artículos: ${DOCUMENTS.length}`)
  console.log(`   Drive URL: PLACEHOLDER (reemplazá en el CMS)\n`)

  if (!CMS_PASSWORD) {
    console.error('❌  Falta CMS_PASSWORD')
    console.error('   $env:CMS_EMAIL="tu@email.com"; $env:CMS_PASSWORD="tu_pass"')
    console.error('   node scripts/seed-ley5282.mjs')
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

  let ok = 0, fail = 0

  for (let i = 0; i < DOCUMENTS.length; i++) {
    const doc = DOCUMENTS[i]
    process.stdout.write(`   [${String(i + 1).padStart(2, '0')}] ${doc.category}... `)
    try {
      await createDoc(token, doc, i)
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
    console.log(`\n   ➜ Actualizá los links en el CMS:`)
    console.log(`     ${CMS_URL}/admin/collections/ley5282`)
    console.log(`   ➜ Portal: http://localhost:3001/ley-5282`)
  }
  console.log()
}

main().catch(err => { console.error(err); process.exit(1) })
