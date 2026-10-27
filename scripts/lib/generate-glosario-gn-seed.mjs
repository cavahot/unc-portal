/**
 * generate-glosario-gn-seed.mjs — GLO-GN-01
 *
 * Genera scripts/lib/glosarioGnSeedData.mjs a partir del glosario del PO (glosario_es_gn.csv), de forma
 * determinista: el mismo CSV produce el mismo módulo byte a byte (sin fecha de ejecución; la fecha de la
 * cabecera es la de consulta declarada por el PO y se pasa como argumento).
 * Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §3.
 *
 * Uso:
 *   node scripts/lib/generate-glosario-gn-seed.mjs [--csv <ruta>] [--fecha 2026-10-11] [--check]
 *   --csv    ruta del CSV (por defecto la carpeta de trabajo del PO, solo lectura; ver DEFAULT_CSV)
 *   --check  no escribe: falla si el módulo versionado no coincide con el CSV
 *
 * Reglas: el CSV del PO no se modifica; solo se normaliza la ortografía técnica (NFC, puso único) y se
 * cuenta en la cabecera. La URL se separa: host oficial → `fuenteUrl` + `oficial`; otro host → `evidenciaUrl`.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseCsvRecords } from './csvParse.mjs'
import { isOfficialUrl } from './glosarioSources.mjs'
import { normalizeGn } from './glosarioGn.mjs'

/** Valor por defecto documentado: carpeta de trabajo del PO (fuera del repositorio, solo lectura). */
export const DEFAULT_CSV = 'C:\\Users\\UNC\\Downloads\\PoblacionAUPP\\Traduccion_Guarani\\glosario_es_gn.csv'
/** Fecha de consulta de las fuentes declarada por el PO en fuentes_guarani.md. */
export const DEFAULT_FECHA = '2026-10-11'

const TIPOS = new Set(['diccionario', 'oficial', 'prestamo', 'neologismo', 'institucional', 'corpus', 'localizacion'])
const CONFIANZAS = new Set(['A', 'B', 'C', 'X'])
const HEADER = ['termino_es', 'termino_gn', 'variantes_gn', 'tipo', 'fuente', 'url', 'confianza', 'nota']

/**
 * Convierte una fila del CSV del PO en la forma del CMS. Lanza ante tipo/confianza desconocidos para no
 * sembrar valores que el panel rechazaría.
 */
export function toSeedEntry(rec, { fecha = DEFAULT_FECHA } = {}) {
  const tipo = rec.tipo.trim()
  const confianza = rec.confianza.trim()
  if (!TIPOS.has(tipo)) throw new Error(`Tipo desconocido «${tipo}» en «${rec.termino_es}».`)
  if (!CONFIANZAS.has(confianza)) throw new Error(`Confianza desconocida «${confianza}» en «${rec.termino_es}».`)
  const url = rec.url.trim()
  const oficial = url !== '' && isOfficialUrl(url)
  const entry = {
    terminoEs: rec.termino_es.trim().normalize('NFC'),
    terminoGn: normalizeGn(rec.termino_gn.trim()),
    variantesGn: rec.variantes_gn
      .split(';')
      .map((v) => normalizeGn(v.trim()))
      .filter(Boolean)
      .map((valor) => ({ valor })),
    tipo,
    fuente: rec.fuente.trim() || 'Sin evidencia',
    confianza,
    oficial,
    revisado: false,
    activo: true,
    origen: 'glosario-po',
    fechaConsulta: fecha,
    nota: rec.nota.trim().normalize('NFC'),
  }
  if (oficial) entry.fuenteUrl = url
  else if (url) entry.evidenciaUrl = url
  return entry
}

/** Lee y valida el CSV; devuelve `{ entries, meta }`. */
export function buildSeed(csvText, { fileName = 'glosario_es_gn.csv', fecha = DEFAULT_FECHA } = {}) {
  const records = parseCsvRecords(csvText)
  const first = Object.keys(records[0] ?? {})
  if (HEADER.some((h, i) => first[i] !== h)) throw new Error(`Cabecera inesperada: ${first.join(',')}`)
  const entries = records.map((r) => toSeedEntry(r, { fecha }))
  const keys = new Set()
  for (const e of entries) {
    const k = `${e.terminoEs}\u0000${e.fuente}`
    if (keys.has(k)) throw new Error(`Clave repetida (terminoEs + fuente): ${e.terminoEs}`)
    keys.add(k)
  }
  const normalizadas = records.filter((r, i) => r.termino_gn.trim() !== entries[i].terminoGn || r.variantes_gn.includes('\uA78C')).length
  const sha256 = createHash('sha256').update(csvText).digest('hex')
  return { entries, meta: { fileName, fecha, filas: entries.length, sha256, normalizadas } }
}

/** Texto del módulo generado (estable: claves en orden fijo, JSON indentado). */
export function renderModule({ entries, meta }) {
  return `// GENERADO por scripts/lib/generate-glosario-gn-seed.mjs — no editar a mano (GLO-GN-01).
// Procedencia: ${meta.fileName} (glosario del PO), fecha de consulta ${meta.fecha}, ${meta.filas} filas,
// sha256 ${meta.sha256}. Filas con ortografía normalizada (NFC / puso único): ${meta.normalizadas}.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §3. Regenerar: node scripts/lib/generate-glosario-gn-seed.mjs --csv <ruta>

/** Metadatos de procedencia del dataset. */
export const GLOSARIO_GN_META = Object.freeze(${JSON.stringify(meta, null, 2)})

/** Entradas del glosario del PO en la forma de la colección \`glosario-guarani\`. */
export const GLOSARIO_GN_SEED = Object.freeze(${JSON.stringify(entries, null, 2)})
`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, def) => {
    const i = process.argv.indexOf(name)
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def
  }
  const csvPath = arg('--csv', DEFAULT_CSV)
  const out = resolve(dirname(fileURLToPath(import.meta.url)), 'glosarioGnSeedData.mjs')
  const text = renderModule(buildSeed(readFileSync(csvPath, 'utf8'), { fileName: basename(csvPath), fecha: arg('--fecha', DEFAULT_FECHA) }))
  if (process.argv.includes('--check')) {
    const current = readFileSync(out, 'utf8')
    if (current !== text) {
      console.error('glosarioGnSeedData.mjs no coincide con el CSV: regenerar.')
      process.exit(1)
    }
    console.log('glosarioGnSeedData.mjs coincide con el CSV.')
  } else {
    writeFileSync(out, text, 'utf8')
    console.log(`Escrito ${out}`)
  }
}
