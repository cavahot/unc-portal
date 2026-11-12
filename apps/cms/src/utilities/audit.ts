import type { PayloadRequest, Payload } from 'payload'
import { getPayload } from 'payload'

export type AuditAction =
  | 'login'
  | 'logout'
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'publicar'
  | 'cambiar_rol'
  | 'revisar'
  | 'aprobar'
  | 'rechazar'
  | 'importar'
  | 'revalidar'
  // SEC-CUENTAS-01 (S5): cambio de contraseña propio y restablecimiento por un administrador.
  | 'cambiar_clave'
  | 'restablecer_clave'

export type AuditResult = 'exito' | 'error' | 'advertencia'

export interface AuditLogData {
  usuario: string
  rol?: string
  accion: AuditAction
  coleccion?: string
  documento?: string
  ip?: string
  resultado: AuditResult
  mensaje?: string
  cambiosRelevantes?: Record<string, unknown>
}

/**
 * Escribe un evento en `auditoria` por Local API (sin ACL) y nunca lanza.
 * SEC-CUENTAS-01: la configuración se importa solo si no llega una instancia de Payload. Antes se importaba al cargar el
 * módulo y formaba un ciclo `payload.config` → colección → hook → `audit` → `payload.config` que, además, obligaba a
 * cualquier módulo que importara un hook auditado (p. ej. la colección `users`) a evaluar toda la configuración.
 * Límite: sin instancia, la primera llamada paga la carga de la configuración (igual que antes, pero diferida).
 */
export async function logAudit(data: AuditLogData, payloadInstance?: Payload): Promise<void> {
  try {
    const payload = payloadInstance ?? await getPayload({ config: (await import('../payload.config')).default })

    await payload.create({
      collection: 'auditoria',
      data: {
        usuario: data.usuario,
        rol: data.rol,
        accion: data.accion,
        coleccion: data.coleccion,
        documento: data.documento,
        fechaHora: new Date().toISOString(),
        ip: data.ip,
        resultado: data.resultado,
        mensaje: data.mensaje,
        cambiosRelevantes: data.cambiosRelevantes || null,
      },
    })
  } catch (error) {
    console.error('[Audit] Error logging event:', error instanceof Error ? error.message : error)
  }
}

export function getClientIP(req: PayloadRequest | undefined): string {
  if (!req) return 'unknown'

  const forwarded = req.headers?.get?.('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const ip = (req as any).ip || req.headers?.get?.('x-real-ip')
  return ip || 'unknown'
}

// SEC-027: la comparación minimizada vive en auditChanges.ts (módulo puro, con pruebas propias).
export { extractChanges } from './auditChanges'
