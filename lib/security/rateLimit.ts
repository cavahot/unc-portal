/**
 * DEP-06 / RDD-DEP-14: limitador de ventana deslizante en memoria con reloj inyectable.
 *
 * Qué hace: cuenta, por clave (IP confiable), las peticiones aceptadas dentro de los últimos
 * `windowMs` y rechaza las que superen `limit`.
 * Amenaza que evita: spam (contacto), fuerza bruta de secretos (preview, revalidate) y
 * abuso del túnel de Sentry.
 * Límites: el almacén vive en memoria de UN proceso; no se comparte entre réplicas ni
 * sobrevive a reinicios (con N réplicas el límite efectivo llega a N x limit). La decisión
 * de un almacén compartido (Redis u otro) queda PENDIENTE. Un límite por IP no frena un
 * ataque distribuido. Con más de `maxKeys` IPs distintas se expulsan las más antiguas.
 */

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Segundos hasta que expire la marca más antigua de la ventana (>= 1). */
  retryAfterSeconds: number
}

export interface RateLimiterOptions {
  limit: number
  windowMs: number
  /** Reloj inyectable para pruebas; por defecto `Date.now`. */
  now?: () => number
  /** Tope de claves en memoria (evita crecimiento sin cota). */
  maxKeys?: number
}

export interface RateLimiter {
  check(key: string): RateLimitResult
  /** Número de claves retenidas (diagnóstico y pruebas). */
  size(): number
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs, now = Date.now, maxKeys = 10_000 } = options
  // Por clave: marcas de tiempo de las peticiones ACEPTADAS, en orden creciente.
  const hits = new Map<string, number[]>()

  /** Descarta marcas fuera de la ventana; devuelve la lista viva. */
  function prune(list: number[], t: number): number[] {
    let i = 0
    while (i < list.length && list[i] <= t - windowMs) i++
    return i === 0 ? list : list.slice(i)
  }

  /** Mantiene el mapa acotado: primero claves expiradas, luego las más antiguas. */
  function enforceMaxKeys(t: number): void {
    if (hits.size <= maxKeys) return
    for (const [k, list] of hits) {
      if (prune(list, t).length === 0) hits.delete(k)
    }
    for (const k of hits.keys()) {
      if (hits.size <= maxKeys) break
      hits.delete(k)
    }
  }

  return {
    check(key) {
      const t = now()
      const list = prune(hits.get(key) ?? [], t)
      if (list.length >= limit) {
        // Rechazada: NO se registra, para que insistir no prolongue el bloqueo ni crezca la memoria.
        hits.set(key, list)
        const retryMs = list[0] + windowMs - t
        return { allowed: false, limit, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) }
      }
      list.push(t)
      // delete + set mueve la clave al final del orden de inserción (más reciente).
      hits.delete(key)
      hits.set(key, list)
      enforceMaxKeys(t)
      return { allowed: true, limit, remaining: limit - list.length, retryAfterSeconds: 0 }
    },
    size: () => hits.size,
  }
}

/**
 * Respuesta 429 estándar con `Retry-After` y cabeceras `X-RateLimit-*`.
 * `message` es el cuerpo JSON `{ error }` (cada ruta conserva su estilo previo).
 */
export function tooManyRequests(result: RateLimitResult, message = 'Too Many Requests'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': '0',
    },
  })
}
