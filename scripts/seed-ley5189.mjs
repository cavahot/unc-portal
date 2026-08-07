/**
 * Seed script — Ley 5189/2014
 * Carga los 11 artículos requeridos con período 2024 y link de Drive placeholder.
 *
 * Usage:
 *   $env:CMS_EMAIL="admin@unc.edu.py"; $env:CMS_PASSWORD="tu_password"
 *   node scripts/seed-ley5189.mjs
 */

const CMS_URL = 'http://localhost:3002'
const CMS_EMAIL = process.env.CMS_EMAIL || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || ''

const PLACEHOLDER_DRIVE = 'https://drive.google.com/drive/folders/REEMPLAZAR'

const DOCUMENTS = [
  { category: 'organigrama',                  period: '2024', description: 'Estructura organizacional de la UNC' },
  { category: 'direccion-telefono',            period: '2024', description: 'Dirección y teléfonos de la entidad y sus dependencias' },
  { category: 'nomina-personal',               period: '2024', description: 'Nómina completa del personal de la UNC' },
  { category: 'presupuesto-ingresos-gastos',   period: '2024', description: 'Presupuesto de ingresos y gastos del ejercicio fiscal' },
  { category: 'anexo-personal',                period: '2024', description: 'Anexo del personal con detalle de remuneraciones' },
  { category: 'ejecucion-presupuestaria',      period: '2024', description: 'Ejecución presupuestaria acumulada' },
  { category: 'registro-viaticos',             period: '2024', description: 'Registro mensual de viáticos e informe de actividades' },
  { category: 'bienes-patrimoniales',          period: '2024', description: 'Listado de bienes patrimoniales de la institución' },
  { category: 'funcionarios-comisionados',     period: '2024', description: 'Funcionarios comisionados de otras instituciones' },
  { category: 'otras-informaciones',           period: '2024', description: 'Otras informaciones de interés público' },
  { category: 'cumplimiento-art7',             period: '2024', description: 'Cumplimiento del Art. 7° de la Ley 5189/2014' },
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

async function createDoc(token, doc) {
  const res = await fetch(`${CMS_URL}/api/ley5189`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ ...doc, driveUrl: PLACEHOLDER_DRIVE, active: true, order: DOCUMENTS.indexOf(doc) }),
  })
  if (!res.ok) throw new Error(`POST failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── SEED LEY 5189/2014 ────────────────────────────────────')
  console.log(`   CMS:       ${CMS_URL}`)
  console.log(`   Artículos: ${DOCUMENTS.length}`)
  console.log(`   Drive URL: PLACEHOLDER (reemplazá en el CMS)\n`)

  if (!CMS_PASSWORD) {
    console.error('❌  Falta CMS_PASSWORD')
    console.error('   $env:CMS_EMAIL="tu@email.com"; $env:CMS_PASSWORD="tu_pass"')
    console.error('   node scripts/seed-ley5189.mjs')
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

  for (const doc of DOCUMENTS) {
    process.stdout.write(`   [${String(DOCUMENTS.indexOf(doc) + 1).padStart(2, '0')}] ${doc.category}... `)
    try {
      await createDoc(token, doc)
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
    console.log(`     ${CMS_URL}/admin/collections/ley5189`)
    console.log(`   ➜ Portal: http://localhost:3001/ley-5189`)
  }
  console.log()
}

main().catch(err => { console.error(err); process.exit(1) })
