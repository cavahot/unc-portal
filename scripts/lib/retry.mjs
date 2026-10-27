/**
 * PERF-DB: reintentos con backoff exponencial para el importador WordPress -> Payload.
 * Amenaza que evita: un 5xx, un 429 o un corte de red a mitad de una migración larga la abortaba;
 * reintentar un 4xx de validación, en cambio, solo repite un error que no se arregla solo.
 * Límite: un POST reintentado tras un 5xx podría duplicar si el servidor llegó a guardar el documento;
 * el importador lo cubre consultando el slug antes de crear (idempotencia) y con el slug único del CMS.
 */

/** Reintentos tras el primer intento (hasta 4 llamadas en total). */
export const MAX_RETRIES = 3
/** Espera base: 500 ms, 1 s, 2 s. */
const BASE_DELAY_MS = 500

/** true para errores transitorios: red (sin status), 429 y 5xx. El resto de 4xx no se reintenta. */
export function shouldRetry(status) {
  if (status === undefined || status === null) return true
  return status === 429 || status >= 500
}

/** Espera antes del reintento n (1-based): 500 ms · 2^(n-1). */
export function backoffMs(attempt) {
  return BASE_DELAY_MS * 2 ** (attempt - 1)
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * fetch con reintentos para 5xx, 429 y errores de red. Devuelve la última Response si se agotan los
 * reintentos por status; si se agotan por red, relanza el último error. No lee el cuerpo.
 */
export async function fetchWithRetry(url, init, { fetchImpl = fetch, sleep = defaultSleep } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res
    try {
      res = await fetchImpl(url, init)
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error
      await sleep(backoffMs(attempt + 1))
      continue
    }
    if (!shouldRetry(res.status) || attempt >= MAX_RETRIES) return res
    await sleep(backoffMs(attempt + 1))
  }
}
