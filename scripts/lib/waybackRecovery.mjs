// SEED-PROD-IMG: recupera desde el Internet Archive (Wayback Machine) las imágenes de noticias 2016-2023 que el
// sitio WordPress ya no sirve. Funciones puras + un ejecutor con dependencias inyectadas (pruebas sin red).
// Amenazas que evita: escribir fuera de la carpeta de uploads (ruta con `../`), guardar como imagen una página de
// error HTML del archivo, descargar de un host no previsto y pisar archivos ya presentes.
// Límite: la captura del archivo puede no ser idéntica a la publicada (se usa la más antigua); no recupera lo que
// el Internet Archive nunca guardó.
import { validateUploadBytes } from './mediaLoader.mjs'

/** Ruta relativa admitida en la carpeta de uploads: AAAA/MM/archivo, sin subcarpetas ni `..`. */
const SAFE_REL = /^\d{4}\/\d{2}\/[^/\\]+$/
const ARCHIVE_ORIGIN = 'https://web.archive.org'

/** true si `rel` es una ruta AAAA/MM/archivo segura para unir a la carpeta de uploads. */
export function isSafeRel(rel) {
  return typeof rel === 'string' && SAFE_REL.test(rel) && !rel.split('/').includes('..') && !rel.startsWith('.')
}

/**
 * Lee la salida de la API CDX (`original timestamp` por línea) y devuelve Map rel -> {original, timestamp},
 * conservando la captura más antigua cuando la misma ruta aparece en varios hosts.
 */
export function parseCdx(text) {
  const map = new Map()
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const [original, timestamp] = line.trim().split(/\s+/)
    if (!original || !/^\d{14}$/.test(timestamp ?? '')) continue
    const m = /\/wp-content\/uploads\/(.+)$/.exec(original)
    if (!m) continue
    let rel
    try {
      rel = decodeURIComponent(m[1])
    } catch {
      continue
    }
    if (!isSafeRel(rel)) continue
    const prev = map.get(rel)
    if (!prev || timestamp < prev.timestamp) map.set(rel, { original, timestamp })
  }
  return map
}

/** URL de la copia cruda (sin la barra del archivo) de una captura: `/web/<ts>id_/<original>`. */
export function waybackRawUrl({ original, timestamp }) {
  return `${ARCHIVE_ORIGIN}/web/${timestamp}id_/${original}`
}

/** Lista de descargas: faltantes con ruta segura, con captura y que todavía no estén en disco. */
export function planRecovery({ missing, cdx, exists }) {
  const seen = new Set()
  const plan = []
  for (const rel of missing) {
    if (!isSafeRel(rel) || seen.has(rel)) continue
    seen.add(rel)
    const capture = cdx.get(rel)
    if (!capture || exists(rel)) continue
    plan.push({ rel, url: waybackRawUrl(capture) })
  }
  return plan
}

/**
 * Descarga el plan de a una petición por vez (`delayMs` entre peticiones) y guarda con `write(rel, data)` solo lo
 * que pasa `validateUploadBytes` (firma de imagen coherente con la extensión). Devuelve los contadores.
 */
export async function runRecovery({ plan, fetchImpl = fetch, write, sleep, delayMs = 2000, log = () => {} }) {
  for (const item of plan) {
    if (!item.url.startsWith(`${ARCHIVE_ORIGIN}/web/`) || !isSafeRel(item.rel)) {
      throw new Error(`Plan inválido (solo web.archive.org y rutas AAAA/MM/archivo): ${item.rel}`)
    }
  }
  const counts = { recuperadas: 0, rechazadas: 0, noDisponibles: 0, errores: 0 }
  for (const [i, item] of plan.entries()) {
    if (i > 0) await sleep(delayMs)
    try {
      const res = await fetchImpl(item.url, { headers: { 'User-Agent': 'unc-portal-migracion/1.0' } })
      if (!res.ok) {
        counts.noDisponibles++
        log(`  - ${item.rel}: HTTP ${res.status}`)
        continue
      }
      const data = Buffer.from(await res.arrayBuffer())
      const check = validateUploadBytes({ filename: item.rel.split('/').pop(), data })
      if (!check.ok) {
        counts.rechazadas++
        log(`  ! ${item.rel}: rechazada (${check.code})`)
        continue
      }
      write(item.rel, data)
      counts.recuperadas++
      log(`  + ${item.rel}`)
    } catch (err) {
      counts.errores++
      log(`  ! ${item.rel}: error de red (${err?.code ?? err?.name ?? 'desconocido'})`)
    }
  }
  return counts
}
