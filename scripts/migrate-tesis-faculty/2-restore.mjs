/**
 * PASO 2: Restaurar relaciones Tesis → Facultad
 *
 * Ejecutar DESPUÉS de que el CMS haya arrancado y auto-migrado el schema.
 *
 * Uso:
 *   node scripts/migrate-tesis-faculty/2-restore.mjs
 *
 * Variables de entorno (cargadas desde .env.local si existe):
 *   NEXT_PUBLIC_CMS_URL  — URL del CMS (default: http://localhost:3002)
 *   CMS_API_KEY          — API key con rol admin (crear en /admin → API Keys)
 *
 * El script lee scripts/migrate-tesis-faculty/tesis_facultad_backup.csv
 * generado por 1-backup.sql.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Config ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_FILE = path.join(__dirname, 'tesis_facultad_backup.csv')
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? 'http://localhost:3002'
const API_KEY  = process.env.CMS_API_KEY

if (!API_KEY) {
  console.error('❌  CMS_API_KEY no está definida. Creá una en /admin → API Keys.')
  process.exit(1)
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌  Backup no encontrado: ${BACKUP_FILE}`)
  console.error('    Ejecutá primero: psql $DATABASE_URL -f scripts/migrate-tesis-faculty/1-backup.sql')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `users API-Key ${API_KEY}`,
}

async function getFacultadBySlug(slug) {
  const url = `${CMS_URL}/api/facultades?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GET /facultades failed: ${res.status}`)
  const body = await res.json()
  return body.docs?.[0] ?? null
}

async function updateTesisFacultad(tesisId, facultadId) {
  const res = await fetch(`${CMS_URL}/api/tesis/${tesisId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ facultad: facultadId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH /tesis/${tesisId} failed: ${res.status} — ${text}`)
  }
  return res.json()
}

// ── Main ──────────────────────────────────────────────────────────────────────

const csv = fs.readFileSync(BACKUP_FILE, 'utf8').trim().split('\n')
const rows = csv.slice(1).map((line) => {
  const [id, facultad] = line.split(',')
  return { id: parseInt(id.trim(), 10), slug: facultad.trim() }
}).filter((r) => !isNaN(r.id) && r.slug)

console.log(`\n📋  ${rows.length} registros encontrados en el backup\n`)

// Cache de slugs → IDs para no repetir requests
const facultadCache = new Map()

let ok = 0
let errors = 0

for (const { id, slug } of rows) {
  try {
    // Buscar la facultad por slug (con caché)
    if (!facultadCache.has(slug)) {
      const facultad = await getFacultadBySlug(slug)
      if (!facultad) {
        console.warn(`⚠️   Facultad con slug "${slug}" no encontrada en el CMS — ¿fue cargada?`)
        errors++
        continue
      }
      facultadCache.set(slug, { id: facultad.id, nombre: facultad.nombre })
    }

    const { id: facultadId, nombre } = facultadCache.get(slug)
    await updateTesisFacultad(id, facultadId)
    console.log(`✅  Tesis #${id} → ${nombre}`)
    ok++
  } catch (err) {
    console.error(`❌  Tesis #${id} (${slug}): ${err.message}`)
    errors++
  }
}

console.log(`\n── Resultado ──────────────────────────────────`)
console.log(`   Actualizados: ${ok}`)
console.log(`   Errores:      ${errors}`)
if (errors > 0) {
  console.log('\n💡  Los registros con error necesitan asignación manual desde el CMS admin.')
}
