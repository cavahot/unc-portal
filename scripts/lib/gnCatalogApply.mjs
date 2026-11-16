// GLO-GN-03: biblioteca pura para aplicar al catálogo messages/gn las traducciones del documento
// «UNC-Glosario-Guarani-completado» (secciones 2 y 3: «Dónde aparece» = archivo:clave).
// Qué hace: decide qué clave se completa y cuál se omite, y reescribe el JSON conservando su formato.
// Por qué así: cada ubicación del documento se contrasta con el texto español del catálogo antes de escribir
// (evita escribir en una clave equivocada) y solo se completan claves que en gn todavía repiten el español
// (no se pisa una traducción ya hecha). Los marcadores {…} deben conservarse exactos.
// Límite: no valida que el guaraní sea correcto (exige revisión nativa) ni la sintaxis ICU completa; eso lo
// comprueba tests/unit/i18n-gn-catalog.spec.ts sobre el resultado.
import { normalizeGn } from './glosarioGn.mjs'

/** Lee un valor anidado por ruta «a.b.c»; devuelve undefined si no existe. */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}

/** Aplana un catálogo a pares [ruta, texto]. */
function flatten(o, p = '') {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v]] : v && typeof v === 'object' ? flatten(v, `${p}${k}.`) : []))
}

/** Marcadores {nombre} de un texto, ordenados (multiconjunto). */
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join(',')

/** Separa «ns:ruta, ns:ruta» en pares; el archivo es el espacio de nombres (p. ej. pages.titulos). */
function splitDonde(donde) {
  return donde
    .split(/,\s*(?=[\w.-]+:)/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const i = t.indexOf(':')
      // «(+N)» es la forma abreviada del documento para «y otras N ubicaciones»: se quita del nombre de la clave.
      const more = /\s*\(\+\d+\)\s*$/.test(t)
      return { file: t.slice(0, i), path: t.slice(i + 1).replace(/\s*\(\+\d+\)\s*$/, ''), more }
    })
}

/**
 * Arma el plan. `es` y `gn` son objetos `{ [archivo sin .json]: catálogo }`.
 * Devuelve `{ updates: [{ file, path, value }], skipped: [{ where, reason }] }`.
 */
export function planCatalog({ rows, es, gn }) {
  const updates = []
  const skipped = []
  for (const r of rows) {
    if (!r.terminoGn) continue // sin traducción en el documento: no hay nada que aplicar
    const value = normalizeGn(r.terminoGn)
    const locations = splitDonde(r.donde ?? '')
    // Ubicaciones abreviadas «(+N)»: se completan también las claves con el MISMO texto español que sigan sin traducir.
    if (locations.some((l) => l.more)) {
      for (const file of Object.keys(es)) {
        for (const [path, text] of flatten(es[file])) {
          if (text.trim().normalize('NFC') !== r.terminoEs.trim().normalize('NFC')) continue
          if (!locations.some((l) => l.file === file && l.path === path)) locations.push({ file, path, more: false, implicit: true })
        }
      }
    }
    for (const { file, path, implicit } of locations) {
      const where = `${file}:${path}`
      const esVal = es[file] ? getPath(es[file], path) : undefined
      const gnVal = gn[file] ? getPath(gn[file], path) : undefined
      if (typeof esVal !== 'string' || typeof gnVal !== 'string') { skipped.push({ where, reason: 'la clave no existe en el catálogo' }); continue }
      if (esVal.trim().normalize('NFC') !== r.terminoEs.trim().normalize('NFC')) { skipped.push({ where, reason: 'el texto español no coincide con el del documento' }); continue }
      if (gnVal !== esVal) {
        if (gnVal === value || implicit) continue // ya aplicada (idempotente) o ubicación implícita ya traducida
        skipped.push({ where, reason: 'ya traducida en el catálogo: no se pisa' }); continue
      }
      if (placeholders(value) !== placeholders(esVal)) { skipped.push({ where, reason: 'la traducción cambia los marcadores {…}' }); continue }
      updates.push({ file, path, value })
    }
  }
  return { updates, skipped }
}

/** Reescribe el JSON con los cambios conservando fin de línea y salto final del archivo original. */
export function applyToJson(original, changes) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  const obj = JSON.parse(original)
  for (const { path, value } of changes) {
    const keys = path.split('.')
    const last = keys.pop()
    let o = obj
    for (const k of keys) o = o[k]
    o[last] = value
  }
  const text = JSON.stringify(obj, null, 2).replace(/\n/g, eol)
  return original.endsWith('\n') ? text + eol : text
}
