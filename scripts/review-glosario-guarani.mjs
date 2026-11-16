// review-glosario-guarani.mjs — revisión periódica de cadenas todavía iguales al español.
// Qué hace: compara messages/es contra messages/gn y genera un informe accionable para el superadmin.
// Amenaza: evita que nuevas etiquetas lleguen al portal sin detectar que siguen sin traducir.
// Límite: igualdad de texto no prueba calidad lingüística; las frases iguales intencionalmente deben marcarse como excepción.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const ES_DIR = join(ROOT, 'messages', 'es')
const GN_DIR = join(ROOT, 'messages', 'gn')
const flatten = (value, prefix = '', output = {}) => {
  if (typeof value === 'string') output[prefix] = value
  else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, output)
  return output
}

export function reviewCatalogs({ esDir = ES_DIR, gnDir = GN_DIR, read = (file) => JSON.parse(readFileSync(file, 'utf8')) } = {}) {
  const files = readdirSync(esDir).filter((file) => file.endsWith('.json')).sort()
  const untranslated = []
  const summary = []
  for (const file of files) {
    const es = flatten(read(join(esDir, file)))
    const gnPath = join(gnDir, file)
    let gn = {}
    try { gn = flatten(read(gnPath)) } catch { /* El catálogo faltante queda reportado como archivo completo. */ }
    const rows = Object.entries(es).filter(([key, value]) => gn[key] === value).map(([key, value]) => ({ file, key, value }))
    untranslated.push(...rows)
    summary.push({ file, total: Object.keys(es).length, igualesAlEspanol: rows.length })
  }
  return { generatedAt: new Date().toISOString(), total: untranslated.length, summary, untranslated }
}

function arg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = reviewCatalogs()
  const reportDir = resolve(arg('--report-dir') ?? join(ROOT, 'tmp', 'guarani-review'))
  mkdirSync(reportDir, { recursive: true })
  const file = join(reportDir, `guarani-untranslated-${new Date().toISOString().slice(0, 10)}.json`)
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n')
  console.log(`Cadenas iguales al español: ${report.total}`)
  console.log(`Informe: ${file}`)
  if (process.argv.includes('--fail-on-untranslated') && report.total > 0) process.exitCode = 2
}
