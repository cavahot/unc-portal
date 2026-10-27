import { Pool } from 'pg'

import { getDatabaseURL } from '../config/database'

/**
 * DEP-09 (A): lógica de la sonda de readiness del CMS (`GET /api/health/ready`).
 * Vive aquí y no en `route.ts` porque Next solo admite exports de handler en los archivos de ruta
 * y porque así se puede probar con reloj y sonda inyectables.
 * Spec: docs/specs/deploy/DEP-09-health-y-rollback.md · RDD-DEP-27, RDD-DEP-31.
 */

/** Tope de la consulta a la BD. Más tiempo = el healthcheck de Docker/deploy espera de más. */
export const PROBE_TIMEOUT_MS = 2000
/** Vigencia del resultado en proceso: acota las conexiones a Postgres a 1 cada 5 s por proceso. */
export const CACHE_TTL_MS = 5000
export const RATE_LIMIT = 30
export const RATE_WINDOW_MS = 60_000
const MAX_KEYS = 1000

// IPv4/IPv6 literal (mismo criterio que lib/security/clientIp.ts del portal, DEP-06).
const IP_LITERAL = /^[0-9a-fA-F:.]{2,45}$/
const NO_IP = 'no-ip'

/**
 * Comprueba que Postgres acepta una conexión y responde `SELECT 1` dentro de PROBE_TIMEOUT_MS.
 * Devuelve true/false y NUNCA lanza ni expone el motivo.
 * Amenaza que evita: reportar «sano» con la BD caída (health engañoso) sin filtrar host, URI ni
 * mensajes del driver. Usa una conexión propia de 1 cliente (no el pool de Payload): así la sonda no
 * compite con las peticiones reales ni depende de que Payload haya inicializado.
 * Límite: prueba conectividad y respuesta, no que el esquema esté al día (DEP-07 C8 queda sin
 * implementar: el orden lo garantiza `depends_on: cms-migrate`).
 */
export async function probeDatabase(): Promise<boolean> {
  let pool: Pool | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // getDatabaseURL() lanza sin URI PostgreSQL válida: falla cerrado antes de abrir ninguna conexión.
    pool = new Pool({
      connectionString: getDatabaseURL(),
      max: 1,
      connectionTimeoutMillis: PROBE_TIMEOUT_MS,
      query_timeout: PROBE_TIMEOUT_MS,
      idleTimeoutMillis: 1000,
    })
    // Un error asíncrono del cliente inactivo no debe tumbar el proceso.
    pool.on('error', () => undefined)
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('probe timeout')), PROBE_TIMEOUT_MS)
      }),
    ])
    return true
  } catch (error) {
    // Solo el nombre de la excepción: su `message` puede traer host:puerto, usuario o la URI.
    console.error(`[api/health/ready] DB probe failed: ${error instanceof Error ? error.name : 'non-Error thrown'}`)
    return false
  } finally {
    if (timer) clearTimeout(timer)
    // Sin await: si la conexión está colgada, cerrar no debe retener la respuesta.
    void pool?.end().catch(() => undefined)
  }
}

export interface ReadinessOptions {
  probe: () => Promise<boolean>
  now?: () => number
  ttlMs?: number
  limit?: number
  windowMs?: number
}

const json = (body: Record<string, string>, status: number, extra: Record<string, string> = {}): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } })

/**
 * Construye el handler de readiness: limitador por IP → caché de 5 s con una sola sonda en vuelo →
 * 200 `ready` / 503 `unavailable`. El cuerpo es constante: nada de host, URI ni errores.
 * Amenazas: (1) agotar conexiones de Postgres usando una ruta pública como amplificador (lo frenan
 * la caché y el limitador); (2) mapear la infraestructura por los mensajes de error.
 * Límites: el limitador es de ventana fija (hasta 2× el límite en el borde de dos ventanas) y vive
 * en la memoria de UN proceso (N réplicas ⇒ N× el límite); la IP solo es confiable detrás de nginx
 * (`x-real-ip` lo fija `$remote_addr`); sin ella todos comparten el cubo `no-ip` (falla hacia limitar).
 */
export function createReadinessHandler(options: ReadinessOptions): (headers: Headers) => Promise<Response> {
  const { probe, now = Date.now, ttlMs = CACHE_TTL_MS, limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS } = options
  const windows = new Map<string, { start: number; count: number }>()
  let cached: { at: number; ready: boolean } | undefined
  let inFlight: Promise<boolean> | undefined

  /** Ventana fija por clave; descarta claves viejas y acota el mapa a MAX_KEYS. */
  function allow(key: string, t: number): { ok: true } | { ok: false; retryAfter: number } {
    if (windows.size > MAX_KEYS) {
      for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k)
      for (const k of windows.keys()) {
        if (windows.size <= MAX_KEYS) break
        windows.delete(k)
      }
    }
    const w = windows.get(key)
    if (!w || t - w.start >= windowMs) {
      windows.set(key, { start: t, count: 1 })
      return { ok: true }
    }
    if (w.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((w.start + windowMs - t) / 1000)) }
    w.count += 1
    return { ok: true }
  }

  return async function handle(headers: Headers): Promise<Response> {
    const t = now()
    const raw = headers.get('x-real-ip')?.trim()
    const key = raw && IP_LITERAL.test(raw) ? raw : NO_IP
    const verdict = allow(key, t)
    if (!verdict.ok) {
      return json({ status: 'rate_limited' }, 429, { 'Retry-After': String(verdict.retryAfter) })
    }

    if (!cached || t - cached.at >= ttlMs) {
      // Las peticiones concurrentes comparten la misma sonda (una sola conexión a Postgres).
      inFlight ??= probe()
        .catch(() => false)
        .finally(() => {
          inFlight = undefined
        })
      const ready = await inFlight
      cached = { at: now(), ready }
    }
    return cached.ready ? json({ status: 'ready' }, 200) : json({ status: 'unavailable' }, 503)
  }
}
