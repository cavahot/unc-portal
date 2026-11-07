/**
 * apply-gn-translations.mjs — GLO-GN-03
 *
 * Aplica al catálogo messages/gn las traducciones de las secciones 2 y 3 del documento
 * «UNC-Glosario-Guarani-completado.md», usando la columna «Dónde aparece» (archivo:clave).
 *
 * Uso:
 *   node scripts/apply-gn-translations.mjs --file <ruta.md>            # dry-run: muestra el plan
 *   node scripts/apply-gn-translations.mjs --file <ruta.md> --apply    # escribe messages/gn/*.json
 *
 * Reglas: solo completa claves que en gn repiten el español; no pisa traducciones; conserva marcadores {…},
 * fin de línea y formato. Después ejecute tests/unit/i18n-gn-catalog.spec.ts (valida ICU, puso y claves).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCompletado } from './lib/glosarioCompletado.mjs'
import { applyToJson, planCatalog } from './lib/gnCatalogApply.mjs'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', 'messages')
const argv = process.argv.slice(2)
const fi = argv.indexOf('--file')
if (fi < 0 || !argv[fi + 1]) {
  console.error('Falta --file <ruta al documento .md>')
  process.exit(1)
}
const apply = argv.includes('--apply')

const names = readdirSync(join(ROOT, 'es')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
const load = (loc) => Object.fromEntries(names.map((n) => [n, JSON.parse(readFileSync(join(ROOT, loc, `${n}.json`), 'utf8'))]))
const parsed = parseCompletado(readFileSync(argv[fi + 1], 'utf8'))
const { updates, skipped } = planCatalog({ rows: [...parsed.sec2, ...parsed.sec3], es: load('es'), gn: load('gn') })

const byFile = {}
for (const u of updates) (byFile[u.file] ??= []).push(u)
console.log(`Plan: ${updates.length} claves en ${Object.keys(byFile).length} archivos · omitidas ${skipped.length}`)
for (const s of skipped) console.log(`  - omitida ${s.where}: ${s.reason}`)

if (!apply) {
  console.log('[dry-run] no se escribió nada; agregue --apply.')
} else {
  for (const [file, changes] of Object.entries(byFile)) {
    const path = join(ROOT, 'gn', `${file}.json`)
    writeFileSync(path, applyToJson(readFileSync(path, 'utf8'), changes))
  }
  console.log(`Escritos ${Object.keys(byFile).length} archivos en messages/gn.`)
}
