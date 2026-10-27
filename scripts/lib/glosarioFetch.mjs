// GLO-GN-01: descarga «cortés» y restringida a hosts oficiales para el actualizador del glosario guaraní.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §4 punto 3 y escenarios 10–11.
import { isOfficialUrl } from './glosarioSources.mjs'

/** User-Agent descriptivo: el operador del sitio oficial sabe quién consulta y para qué. */
export const USER_AGENT = 'unc-portal-glosario/1.0 (actualización autorizada de vocabulario oficial)'
/** Tope de descarga: el CSV de la SPL pesaba 263 KB según el PO; 25 MB deja margen sin riesgo de memoria. */
export const MAX_BYTES = 25 * 1024 * 1024
export const TIMEOUT_MS = 30_000
export const MIN_INTERVAL_MS = 1_000
const MAX_REDIRECTS = 3
/** Tipos aceptados. HTML no: una página de error servida con 200 no debe tomarse como datos. */
export const ALLOWED_CONTENT_TYPES = Object.freeze(['text/csv', 'application/csv', 'application/json', 'text/plain', 'application/octet-stream'])

/**
 * Crea una función `get(url, { minIntervalMs, accept })` con la política del actualizador.
 * Controles (amenaza → control):
 *  - host ajeno o http → solo `isOfficialUrl`, comprobado ANTES de cada pedido y en cada redirección;
 *  - redirección a un host ajeno → `redirect: 'manual'` y validación de `Location` (máx. 3 saltos);
 *  - TLS sin verificar → se niega si `NODE_TLS_REJECT_UNAUTHORIZED=0`;
 *  - saturar el sitio → pausa mínima por host (≥ 1 s; la fuente puede exigir más) y tiempo límite;
 *  - respuesta enorme → tope por `content-length` y por bytes leídos;
 *  - HTML de error tomado por datos → lista de tipos permitidos.
 * Límite: no interpreta robots.txt; la pausa por fuente se fija en el registro según lo declarado por el PO.
 * `deps` (fetch, now, sleep, env, maxBytes) permite probarla sin red.
 */
export function makePoliteFetch({ fetch = globalThis.fetch, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), env = process.env, maxBytes = MAX_BYTES } = {}) {
  const lastByHost = new Map()

  return async function get(url, { minIntervalMs = MIN_INTERVAL_MS, accept = 'text/csv, application/json;q=0.9, */*;q=0.1' } = {}) {
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      throw new Error('TLS sin verificar (NODE_TLS_REJECT_UNAUTHORIZED=0): el actualizador se niega a descargar.')
    }
    let current = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isOfficialUrl(current)) throw new Error(`Host no oficial o sin https, no se descarga: ${current}`)
      const host = new URL(current).hostname
      const wait = Math.max(minIntervalMs, MIN_INTERVAL_MS)
      const last = lastByHost.get(host)
      if (last !== undefined) {
        const remaining = last + wait - now()
        if (remaining > 0) await sleep(remaining)
      }
      lastByHost.set(host, now())
      const res = await fetch(current, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) throw new Error(`Redirección HTTP ${res.status} sin destino desde ${current}`)
        current = new URL(loc, current).href
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${current}`)
      const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (!ALLOWED_CONTENT_TYPES.includes(type)) throw new Error(`tipo de contenido no permitido (${type || 'vacío'}) en ${current}`)
      const declared = Number(res.headers.get('content-length') || 0)
      if (declared > maxBytes) throw new Error(`La respuesta supera el tope de ${maxBytes} bytes (${declared}).`)
      const bytes = await readCapped(res, maxBytes)
      return { url: current, status: res.status, contentType: type, bytes: bytes.length, text: new TextDecoder('utf-8').decode(bytes) }
    }
    throw new Error(`Demasiadas redirecciones desde ${url}`)
  }
}

/** Lee el cuerpo por partes y aborta en cuanto supera el tope (no confía solo en `content-length`). */
async function readCapped(res, maxBytes) {
  if (!res.body || typeof res.body.getReader !== 'function') {
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.length > maxBytes) throw new Error(`La respuesta supera el tope de ${maxBytes} bytes.`)
    return buf
  }
  const reader = res.body.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      throw new Error(`La respuesta supera el tope de ${maxBytes} bytes.`)
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}
