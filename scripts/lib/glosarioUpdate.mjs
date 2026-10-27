// GLO-GN-01: reglas puras del actualizador del glosario guaraní (análisis de la fuente y plan de fusión).
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §4 punto 4 y escenario 9. Sin red ni CMS: se prueban aislado.
import { parseCsvRecords } from './csvParse.mjs'
import { baseTerm, foldKey, normalizeGn } from './glosarioGn.mjs'

const TERM_COLUMNS = ['palabra', 'termino', 'termino_es', 'espanol', 'español']
const GLOSS_COLUMNS = ['significado', 'traduccion', 'traducción', 'guarani', 'guaraní', 'termino_gn']

/**
 * Analiza el CSV del «Vocabulario del Español al Guaraní» de la SPL (columnas según el PO: palabra_id,
 * palabra, clavebusqueda, significado, archivo de audio). Devuelve `[{ terminoEs, glosas }]`:
 *  - término en minúsculas y NFC; filas sin término o sin glosa se descartan;
 *  - glosas separadas por «;» o «,», normalizadas con `normalizeGn` (el CSV trae ä ë ï ü ÿ por ã ẽ ĩ ũ ỹ);
 *  - términos repetidos se agrupan sin duplicar glosas.
 * Lanza «formato inesperado» si no encuentra las columnas: el actualizador lo informa como «manual» en vez
 * de adivinar columnas.
 */
export function parseSplCsv(text) {
  const records = parseCsvRecords(text)
  const cols = Object.keys(records[0] ?? {}).map((c) => c.toLowerCase())
  const termCol = Object.keys(records[0] ?? {})[cols.findIndex((c) => TERM_COLUMNS.includes(c))]
  const glossCol = Object.keys(records[0] ?? {})[cols.findIndex((c) => GLOSS_COLUMNS.includes(c))]
  if (!termCol || !glossCol) throw new Error(`CSV de la SPL con formato inesperado (columnas: ${cols.join(', ') || 'ninguna'}).`)
  const byTerm = new Map()
  for (const r of records) {
    const terminoEs = String(r[termCol] ?? '').trim().normalize('NFC').toLowerCase()
    const glosas = String(r[glossCol] ?? '')
      .split(/[;,]/)
      .map((g) => normalizeGn(g.trim()))
      .filter(Boolean)
    if (!terminoEs || glosas.length === 0) continue
    const list = byTerm.get(terminoEs) ?? []
    for (const g of glosas) if (!list.some((x) => foldKey(x) === foldKey(g))) list.push(g)
    byTerm.set(terminoEs, list)
  }
  return [...byTerm.entries()].map(([terminoEs, glosas]) => ({ terminoEs, glosas }))
}

const formsOf = (row) => [row.terminoGn, ...(row.variantesGn ?? []).map((v) => (typeof v === 'string' ? v : v.valor))].filter(Boolean)

/**
 * Calcula, sin escribir, qué haría el actualizador con las entradas de una fuente oficial.
 * Reglas (escenario 9):
 *  - las filas `revisado` y las de otro `origen` (PO, panel) NUNCA se modifican;
 *  - si todas las glosas oficiales ya figuran en alguna fila del término → `ya-cubierto` (no escribe);
 *  - si no hay fila propia → `crear` (o `crear-conflicto` con nota «Pendiente de revisión» cuando otra fila
 *    del término da una glosa distinta); la fila nueva es `oficial`, confianza A, `origen=actualizador`;
 *  - si hay fila propia y la fuente trae glosas nuevas → `actualizar` agregando variantes y marcando
 *    pendiente; la glosa principal no se reemplaza (solo se completa si estaba vacía);
 *  - si nada cambió → `sin-cambios`. Así el plan es idempotente.
 * Devuelve `{ actions, counts }`; cada acción lleva `type`, `terminoEs` y, si escribe, `data` (e `id` al actualizar).
 */
export function planMerge({ existing, incoming, source, resourceUrl, fecha }) {
  const byKey = new Map()
  for (const row of existing) {
    const k = foldKey(baseTerm(row.terminoEs))
    byKey.set(k, [...(byKey.get(k) ?? []), row])
  }
  const actions = []
  for (const item of incoming) {
    const key = foldKey(baseTerm(item.terminoEs))
    const related = byKey.get(key) ?? []
    const own = related.find((r) => r.fuente === source.nombre)
    const glosas = item.glosas.map(normalizeGn)
    if (own) {
      if (own.revisado) {
        actions.push({ type: 'omitido-revisado', terminoEs: own.terminoEs, id: own.id, glosas })
        continue
      }
      if (own.origen !== 'actualizador') {
        actions.push({ type: 'omitido-otro-origen', terminoEs: own.terminoEs, id: own.id, glosas })
        continue
      }
      const known = new Set(formsOf(own).map(foldKey))
      const nuevas = glosas.filter((g) => !known.has(foldKey(g)))
      if (nuevas.length === 0) {
        actions.push({ type: 'sin-cambios', terminoEs: own.terminoEs, id: own.id })
        continue
      }
      const data = { fechaConsulta: fecha }
      const prevVariants = (own.variantesGn ?? []).map((v) => ({ valor: typeof v === 'string' ? v : v.valor }))
      if (!own.terminoGn) {
        data.terminoGn = nuevas[0]
        data.variantesGn = [...prevVariants, ...nuevas.slice(1).map((valor) => ({ valor }))]
      } else {
        data.variantesGn = [...prevVariants, ...nuevas.map((valor) => ({ valor }))]
        data.nota = appendNota(own.nota, `Pendiente de revisión: la fuente ${source.id} agregó «${nuevas.join(' ; ')}» (${fecha}).`)
      }
      actions.push({ type: 'actualizar', terminoEs: own.terminoEs, id: own.id, data })
      continue
    }
    const otherForms = related.flatMap(formsOf)
    const otherFolded = new Set(otherForms.map(foldKey))
    if (glosas.every((g) => otherFolded.has(foldKey(g)))) {
      actions.push({ type: 'ya-cubierto', terminoEs: item.terminoEs })
      continue
    }
    const conflicto = otherForms.length > 0 && !otherFolded.has(foldKey(glosas[0]))
    const base = `Importado de ${source.id} el ${fecha}. Normalización automática de nasales (ä→ã, etc.).`
    const nota = conflicto
      ? `${base} Pendiente de revisión: difiere de ${related
          .filter((r) => r.terminoGn)
          .map((r) => `«${r.terminoGn}» (${r.fuente})`)
          .join('; ')}.`
      : base
    actions.push({
      type: conflicto ? 'crear-conflicto' : 'crear',
      terminoEs: item.terminoEs,
      data: {
        terminoEs: item.terminoEs,
        terminoGn: glosas[0],
        variantesGn: glosas.slice(1).map((valor) => ({ valor })),
        tipo: 'diccionario',
        fuente: source.nombre,
        fuenteUrl: resourceUrl,
        confianza: 'A',
        oficial: true,
        revisado: false,
        activo: true,
        origen: 'actualizador',
        fechaConsulta: fecha,
        nota: nota.slice(0, 2000),
      },
    })
  }
  const counts = {}
  for (const a of actions) {
    const k = a.type === 'crear-conflicto' ? 'crear' : a.type
    counts[k] = (counts[k] ?? 0) + 1
    if (a.type === 'crear-conflicto') counts.conflictos = (counts.conflictos ?? 0) + 1
  }
  return { actions, counts }
}

/** Agrega una línea a la nota sin superar 2.000 caracteres (tope del campo). */
function appendNota(prev, line) {
  const text = prev ? `${prev}\n${line}` : line
  return text.length > 2000 ? text.slice(text.length - 2000) : text
}
