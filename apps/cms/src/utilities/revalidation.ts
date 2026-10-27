// DEP-19b (Frente 7): revalidación CMS -> portal fiable y no bloqueante.
// Evidencia RDD: RDD-DEP-55/56 (docs/research/evidence-register.md). Spec: docs/specs/deploy/DEP-19b-frontend-demo-y-revalidacion.md.
// Todo vive bajo apps/cms/src: el CMS no puede importar `lib/` del portal (RDD-DEP-31).
import { isStrongSecret } from '../config/secrets'

/** Tiempo máximo de cada intento: un portal colgado no debe retener el guardado del editor. */
const ATTEMPT_TIMEOUT_MS = 3000
/** Reintentos tras el primer intento (3 llamadas como máximo). */
const MAX_RETRIES = 2
/** Espera base entre intentos (200 ms × nº de reintento). */
const BACKOFF_STEP_MS = 200
/** Tope para `Retry-After`: el hook no puede quedarse esperando lo que pida el servidor. */
const MAX_RETRY_AFTER_MS = 2000

export interface RevalidateOptions {
  /** Nombre de la colección/global para el log; por defecto, la etiqueta o `path`. */
  collection?: string
  /** Espera inyectable (pruebas); por defecto `setTimeout`. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Destino por defecto en desarrollo: el portal local. En producción PORTAL_URL lo fija el compose. */
const DEFAULT_PORTAL_URL = 'http://localhost:3000'

export type PortalTarget =
  | { ok: true; origin: string; host: string }
  | { ok: false }

/**
 * Resuelve el destino de la revalidación a partir de PORTAL_URL (DEP-19b, diagnóstico 2026-10-23).
 *
 * Qué hace: sin valor usa `http://localhost:3000`; con valor, exige http(s) válido y se queda SOLO con
 * el origen (descarta ruta, query y credenciales). Devuelve también `host:puerto` para los logs.
 * Por qué: `${PORTAL_URL}/api/revalidate` con una barra final o un camino sobrante producía rutas
 * erróneas, y un valor no http(s) reventaba dentro de `fetch` con un error opaco. Amenaza: filtrar en
 * logs credenciales embebidas (`http://usuario:clave@host`). Límite: no comprueba que el host responda.
 */
export function resolvePortalBaseUrl(raw: string | undefined): PortalTarget {
  const value = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_PORTAL_URL
  try {
    const url = new URL(value)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.hostname === '') return { ok: false }
    return { ok: true, origin: url.origin, host: url.host }
  } catch {
    return { ok: false }
  }
}

/** Códigos de red que se muestran tal cual (forma estricta: nunca texto libre ni URL en el log). */
const NETWORK_CODE = /^(?:E[A-Z]+|UND_ERR_[A-Z_]+|ERR_[A-Z_]+)$/

/**
 * Explica un fallo de `fetch` sin exponer URL ni secretos: devuelve el código de red (ECONNREFUSED,
 * ENOTFOUND, UND_ERR_CONNECT_TIMEOUT…) que undici deja en `error.cause.code` (o en el primer error de
 * un AggregateError al probar ::1 y 127.0.0.1); si no hay, el nombre del error. Antes el log solo decía
 * «error de red (TypeError)», lo que ocultaba que el portal rechazaba la conexión. Límite: depende de
 * la forma de `cause` de Node/undici; un código desconocido cae al nombre del error.
 */
export function describeFetchFailure(error: unknown): string {
  if (!(error instanceof Error)) return 'desconocido'
  const code = (candidate: unknown): string | undefined => {
    const c = (candidate as { code?: unknown } | null | undefined)?.code
    return typeof c === 'string' && NETWORK_CODE.test(c) ? c : undefined
  }
  const cause = (error as { cause?: unknown }).cause
  const nested = (cause as { errors?: unknown[] } | undefined)?.errors
  return code(cause) ?? code(Array.isArray(nested) ? nested[0] : undefined) ?? code(error) ?? error.name
}

/** Evita repetir el aviso de secreto ausente en cada guardado (ruido) pero sin ocultarlo. */
let missingSecretLogged = false

/** true para fallos que pueden ser transitorios: 5xx y 429. El resto de 4xx no mejora reintentando. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

/** Convierte `Retry-After` (segundos) en milisegundos acotados; ausente o inválido -> undefined. */
function retryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get('Retry-After')
  if (raw === null) return undefined
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds < 0) return undefined
  return Math.min(Math.round(seconds * 1000), MAX_RETRY_AFTER_MS)
}

/**
 * Envía la petición de revalidación al portal (DEP-19b). Nunca lanza.
 *
 * Qué hace: POST a `<PORTAL_URL>/api/revalidate` con Bearer, `AbortSignal.timeout(3 s)` y hasta 2
 * reintentos (red/timeout, 5xx y 429; respeta `Retry-After` con tope de 2 s). Registra el fallo
 * final con la colección y el status/motivo, sin secreto ni cuerpo.
 *
 * Amenazas que evita: (1) un portal lento bloquea el guardado del editor (timeout + sin propagar);
 * (2) un 401/429/503 tragado sin rastro (log con status); (3) enviar `Bearer ` vacío o un secreto de
 * ejemplo (se aborta sin llamar y se avisa una vez); (4) filtrar el secreto en logs.
 *
 * Límites: sin cola persistente (si el portal sigue caído tras los reintentos, la invalidación se
 * pierde y el contenido se actualiza al vencer `revalidate`); en el peor caso añade ~10 s al guardado.
 */
async function postRevalidate(body: Record<string, string>, options: RevalidateOptions): Promise<void> {
  const label = options.collection ?? body.tag ?? 'path'
  const sleep = options.sleep ?? defaultSleep
  try {
    // Se lee en cada llamada (no al importar el módulo) para ver el entorno real del proceso.
    const secret = process.env.REVALIDATION_SECRET
    if (!isStrongSecret(secret)) {
      if (!missingSecretLogged) {
        missingSecretLogged = true
        console.error(
          '[Revalidation] REVALIDATION_SECRET ausente o débil: el CMS no avisa al portal y el contenido ' +
            'solo se actualizará al vencer el caché (DEP-19b).',
        )
      }
      return
    }

    const target = resolvePortalBaseUrl(process.env.PORTAL_URL)
    if (!target.ok) {
      // PORTAL_URL mal formada: no se llama a fetch (fallaría con un error opaco) y se dice la causa.
      console.error(`[Revalidation] ${label}: PORTAL_URL no es una URL http(s) válida; no se avisa al portal (DEP-19b).`)
      return
    }
    const baseUrl = target.origin
    const attempts = MAX_RETRIES + 1
    let reason = 'sin intentos'

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let waitMs = BACKOFF_STEP_MS * attempt
      let retryable = true
      try {
        const res = await fetch(`${baseUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(secret as string).trim()}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        })
        if (res.ok) return
        reason = `status ${res.status}`
        retryable = isRetryableStatus(res.status)
        waitMs = retryAfterMs(res) ?? waitMs
      } catch (error) {
        // Solo el código de red o el nombre del error (describeFetchFailure): el mensaje podría incluir la URL.
        reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : `error de red (${describeFetchFailure(error)})`
      }

      if (!retryable || attempt === attempts) break
      console.warn(`[Revalidation] ${label}: ${reason} -> ${target.host}; reintento ${attempt}/${MAX_RETRIES}`)
      await sleep(waitMs)
    }

    console.error(`[Revalidation] ${label}: el portal no confirmó la revalidación (${reason}) -> ${target.host}`)
  } catch (error) {
    // Defensa final: ninguna falla de este módulo puede romper el guardado del editor.
    console.error(`[Revalidation] ${label}: error inesperado (${error instanceof Error ? error.name : 'desconocido'})`)
  }
}

/** Revalida una etiqueta de caché del portal (DEP-19b). Nunca lanza; ver `postRevalidate`. */
export async function revalidatePortalTag(tag: string, options: RevalidateOptions = {}): Promise<void> {
  await postRevalidate({ tag }, options)
}

/** Revalida una ruta del portal (DEP-19b). Nunca lanza; ver `postRevalidate`. */
export async function revalidatePortalPath(path: string, options: RevalidateOptions = {}): Promise<void> {
  await postRevalidate({ path }, options)
}
