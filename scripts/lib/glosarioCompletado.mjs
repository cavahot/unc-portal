// GLO-GN-02: biblioteca pura (sin red, sin Payload) para cargar al glosario el documento
// «UNC-Glosario-Guarani-completado» (propuestas de traducción al guaraní hechas fuera del CMS).
// Qué hace: (1) lee las tablas del documento por nombre de columna; (2) arma un plan de carga:
// completar filas existentes sin traducción, crear las etiquetas de interfaz y omitir lo demás.
// Por qué así: el propio documento dice que son «propuestas de trabajo» sin fuente oficial ni revisión
// lingüística. Por eso TODO entra como «pendiente», no oficial, no revisado y con confianza C, y el portal
// (que solo usa glosas aprobadas por un superadmin con fuente oficial) no las muestra hasta esa revisión.
// Límites: no aprueba nada, no inventa URL de fuente oficial, no toca filas revisadas ni aprobadas y no carga
// la sección 3 (frases largas), que corresponde a messages/gn, no al glosario.
import { normalizeGn } from './glosarioGn.mjs'

/** Fuente común de las etiquetas de interfaz: junto con terminoEs forma la clave única de la colección. */
export const FUENTE_UI = 'Propuesta UNC · etiquetas de interfaz (documento de trabajo 2026-11-06)'
/** Fuente de los términos de la sección 1 que estaban «Sin evidencia» y ahora tienen una propuesta. */
export const FUENTE_TERMINOS = 'Propuesta UNC · términos del glosario (documento de trabajo 2026-11-06)'
/** «Sin evidencia» describe una fila sin traducción; deja de ser cierto cuando se completa. */
const SIN_EVIDENCIA = /^Sin evidencia/i
const MAX_NOTA = 2000
// Máximos de la colección (apps/cms/src/collections/GlosarioGuarani.ts): el CMS rechaza lo que los excede.
const MAX_ES = 200
const MAX_GN = 300

/**
 * Correcciones documentadas sobre lo que trae el documento (clave: texto español).
 * «Oficialización de Padrón Electoral»: el documento proponía «jeporavo rysýi», pero el vocabulario oficial de
 * la SPL (confianza A) traduce «padrón» como «terarysýi» y la prueba de coherencia del catálogo lo exige.
 * Sigue siendo una propuesta: requiere revisión nativa.
 */
export const CORRECCIONES = Object.freeze({
  'Oficialización de Padrón Electoral': 'Terarysýi jeporavo rehegua ñemoneĩ',
})
const AVISO = 'Propuesta de trabajo pendiente de revisión lingüística; no es una equivalencia oficial ni está aprobada.'

/** Devuelve los textos de una fila de tabla Markdown (sin las barras de los extremos). */
const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

/** Quita los asteriscos de negrita del encabezado y lo deja en minúsculas para buscar la columna. */
const headKey = (h) => h.replace(/\*/g, '').trim().toLowerCase()

/** Separa «apoyo léxico» (antes del primer salto) y «criterio» (después de «Criterio:») de la columna de fuente. */
function splitFuente(cell) {
  const apoyo = (cell.split(/<br>/i)[0] ?? '').trim()
  const m = cell.match(/Criterio:\s*([\s\S]*)$/i)
  return { apoyo, criterio: (m ? m[1] : '').replace(/<br>/gi, ' ').trim() }
}

/** Lee una sección: busca las columnas por su nombre para tolerar cambios de orden. */
function readTable(lines) {
  const header = lines.findIndex((l) => l.trim().startsWith('|') && /\*\*#\*\*|\|\s*#\s*\|/.test(l))
  if (header < 0) return []
  const names = cells(lines[header]).map(headKey)
  const col = (...opts) => names.findIndex((n) => opts.some((o) => n.startsWith(o)))
  const idx = {
    n: col('#'),
    es: col('término en español', 'texto en español'),
    tipo: col('tipo'),
    donde: col('dónde aparece'),
    gn: col('guaraní'),
    nota: col('nota'),
    fuente: col('fuente'),
  }
  const out = []
  for (const l of lines.slice(header + 2)) {
    if (!l.trim().startsWith('|')) continue
    const c = cells(l)
    if (!/^\d+$/.test(c[idx.n] ?? '')) continue
    const f = splitFuente(c[idx.fuente] ?? '')
    out.push({
      n: Number(c[idx.n]),
      terminoEs: (c[idx.es] ?? '').normalize('NFC'),
      tipo: idx.tipo >= 0 ? c[idx.tipo] : '',
      donde: idx.donde >= 0 ? c[idx.donde] : '',
      terminoGn: (c[idx.gn] ?? '').trim(),
      notaOriginal: idx.nota >= 0 ? c[idx.nota] : '',
      apoyo: f.apoyo,
      criterio: f.criterio,
    })
  }
  return out
}

/** Lee el documento completo y devuelve las filas de las secciones 1 a 4. */
export function parseCompletado(md) {
  const text = md.replace(/\r/g, '')
  const parts = text.split(/^# (?=\d\.)/m).slice(1)
  const bySec = {}
  for (const p of parts) bySec[p[0]] = readTable(p.split('\n'))
  return { sec1: bySec['1'] ?? [], sec2: bySec['2'] ?? [], sec3: bySec['3'] ?? [], sec4: bySec['4'] ?? [] }
}

/** Arma el texto de la nota; respeta el máximo del campo para que el CMS no rechace la fila. */
function composeNota({ previa, apoyo, criterio, donde }) {
  const partes = [previa, AVISO, apoyo && `Apoyo léxico: ${apoyo}.`, criterio && `Criterio: ${criterio}`, donde && `Aparece en: ${donde}.`]
  return partes.filter(Boolean).join(' ').slice(0, MAX_NOTA)
}

/**
 * Arma el plan. `existing` son las filas actuales del glosario (depth 0).
 * Devuelve `{ actions, skipped }`: cada acción es `{ op: 'create' | 'update', id?, data }`.
 */
export function planCompletado({ parsed, existing }) {
  const actions = []
  const skipped = []
  const skip = (terminoEs, reason) => skipped.push({ terminoEs, reason })
  const key = (es, fuente) => `${es}\u0000${fuente}`
  const taken = new Set(existing.map((r) => key(r.terminoEs, r.fuente)))

  // Sección 1: términos que ya están en el glosario sin traducción → se completa la fila existente.
  for (const r of parsed.sec1) {
    if (!r.terminoGn) { skip(r.terminoEs, 'sin traducción en el documento'); continue }
    const gn = normalizeGn(r.terminoGn)
    const matches = existing.filter((e) => e.terminoEs === r.terminoEs)
    const target = matches.find((e) => !(e.terminoGn ?? '').trim() && !e.revisado && e.estadoRevision !== 'aprobado')
    if (target) {
      actions.push({
        op: 'update',
        id: target.id,
        data: {
          terminoEs: r.terminoEs,
          terminoGn: gn,
          // X = sin evidencia. Con una propuesta documentada pasa a C; A/B ya indican respaldo y no se bajan.
          confianza: target.confianza && target.confianza !== 'X' ? target.confianza : 'C',
          // Una fuente real (diccionario, corpus) se conserva; «Sin evidencia» ya no describe la fila.
          ...(SIN_EVIDENCIA.test(target.fuente ?? '') ? { fuente: FUENTE_TERMINOS } : {}),
          nota: composeNota({ previa: (target.nota ?? '').trim(), apoyo: r.apoyo, criterio: r.criterio }),
        },
      })
    } else if (matches.length) {
      skip(r.terminoEs, 'ya tiene traducción o está revisada/aprobada: no se pisa')
    } else {
      // No existe en el glosario: se crea como propuesta de la misma fuente de interfaz.
      if (taken.has(key(r.terminoEs, FUENTE_UI))) { skip(r.terminoEs, 'ya cargado'); continue }
      taken.add(key(r.terminoEs, FUENTE_UI))
      actions.push({ op: 'create', data: baseRow(r, gn, r.tipo || 'neologismo') })
    }
  }

  // Secciones 2 y 3: etiquetas y frases de interfaz → filas nuevas de localización (una por texto español).
  for (const r of [...parsed.sec2, ...parsed.sec3]) {
    if (!r.terminoGn) { skip(r.terminoEs, 'sin traducción en el documento'); continue }
    const gn = normalizeGn(CORRECCIONES[r.terminoEs] ?? r.terminoGn)
    if (r.terminoEs.length > MAX_ES || gn.length > MAX_GN) { skip(r.terminoEs.slice(0, 60), `excede el máximo del campo (${MAX_ES} es / ${MAX_GN} gn)`); continue }
    if (taken.has(key(r.terminoEs, FUENTE_UI))) { skip(r.terminoEs, 'ya cargado'); continue }
    taken.add(key(r.terminoEs, FUENTE_UI))
    actions.push({ op: 'create', data: baseRow(r, gn, 'localizacion') })
  }

  // Correcciones sobre filas ya cargadas de esta fuente y aún sin revisar ni aprobar.
  for (const row of existing) {
    const fix = CORRECCIONES[row.terminoEs]
    if (!fix || row.fuente !== FUENTE_UI || row.revisado || row.estadoRevision === 'aprobado') continue
    if (normalizeGn(row.terminoGn ?? '') === normalizeGn(fix)) continue
    actions.push({ op: 'update', id: row.id, data: { terminoEs: row.terminoEs, terminoGn: normalizeGn(fix) } })
  }
  // Reparación: filas que este documento ya completó pero quedaron con «Sin evidencia» (se reconocen por el aviso en la nota).
  for (const row of existing) {
    if (!SIN_EVIDENCIA.test(row.fuente ?? '') || !(row.terminoGn ?? '').trim()) continue
    if (row.revisado || row.estadoRevision === 'aprobado' || !(row.nota ?? '').includes(AVISO)) continue
    actions.push({ op: 'update', id: row.id, data: { terminoEs: row.terminoEs, fuente: FUENTE_TERMINOS } })
  }
  return { actions, skipped }
}

/** Fila nueva: siempre pendiente, no oficial y no revisada; sin URL de fuente oficial. */
function baseRow(r, gn, tipo) {
  return {
    terminoEs: r.terminoEs,
    terminoGn: gn,
    tipo,
    confianza: 'C',
    fuente: FUENTE_UI,
    oficial: false,
    revisado: false,
    activo: true,
    origen: 'panel',
    estadoRevision: 'pendiente',
    nota: composeNota({ previa: r.notaOriginal, apoyo: r.apoyo, criterio: r.criterio, donde: r.donde }),
  }
}
