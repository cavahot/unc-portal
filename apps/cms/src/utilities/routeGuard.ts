import type { Payload } from 'payload'

import { hasRole, type UserRole } from '../access/roles'

/**
 * DEP-04 (RDD-DEP-11, RDD-DEP-12): utilidades compartidas por las rutas administrativas del CMS
 * (auditoría, logs, métricas, alertas, dashboard, health y create-bucket).
 * Centralizan tres controles para que ninguna ruta los reimplemente a medias:
 *   1. autenticación + rol ANTES de validar parámetros o consultar datos;
 *   2. parámetros numéricos/enumerados acotados;
 *   3. errores internos genéricos hacia el cliente.
 * Límite: no limitan tasa (DEP-06) ni sustituyen las ACL de cada colección.
 */

type AuthenticatedUser = NonNullable<Awaited<ReturnType<Payload['auth']>>['user']>

export type RoleGuardResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: Response }

/**
 * Autentica la petición por `payload.auth` y comprueba que el rol esté permitido.
 * Devuelve 401 si no hay sesión y 403 si el rol es ajeno, nulo o desconocido.
 * Amenaza que evita: que cualquier sesión (viewer, editor) o un anónimo lea datos
 * operativos o de auditoría. Límite: si `payload.auth` lanza, la excepción sube al
 * handler, que la convierte en 500 genérico con `internalError`.
 */
export async function requireRole(
  payload: Payload,
  request: Request,
  allowedRoles: readonly UserRole[],
): Promise<RoleGuardResult> {
  const { user } = await payload.auth({ headers: request.headers })

  if (!user) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!hasRole(user, allowedRoles)) {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true, user }
}

/**
 * Lee un entero decimal estricto (`^\d+$`) dentro de [min, max].
 * Ausente (`null`) → `fallback`. Presente pero inválido (vacío, signo, decimal, texto o fuera
 * de rango) → `null`: el handler responde 400 en lugar de recortar en silencio.
 * Amenaza: `limit`/`hours` enormes o `NaN` que agoten memoria o rompan el filtro.
 */
export function parseBoundedInt(
  raw: string | null,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number | null {
  if (raw === null) return fallback
  if (!/^\d{1,9}$/.test(raw)) return null
  const value = Number(raw)
  return value >= min && value <= max ? value : null
}

/**
 * Valida un valor contra una lista blanca. Ausente → `fallback`; presente y fuera de lista → `null`.
 * Amenaza: parámetros que componen rutas de archivo de log o filtros arbitrarios de consulta.
 */
export function parseAllowed<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T | undefined,
): T | undefined | null {
  if (raw === null) return fallback
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null
}

export const invalidParameter = (name: string): Response =>
  Response.json({ error: `Invalid parameter: ${name}` }, { status: 400 })

/**
 * Registra el detalle en el log del servidor (solo nombre y mensaje del error, sin objetos de
 * configuración ni credenciales) y devuelve al cliente un mensaje fijo.
 * Amenaza: fuga de `error.message`/stack con rutas, endpoints o URIs de conexión.
 * Límite: el mensaje del error se imprime tal cual; no se garantiza que un driver no incluya datos.
 */
export function internalError(label: string, error: unknown, publicMessage: string, status = 500): Response {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'non-Error thrown'
  console.error(`[${label}] ${detail}`)
  return Response.json({ error: publicMessage }, { status })
}
