import type { PayloadRequest, Payload } from 'payload'
import { getPayload } from 'payload'
import config from '../payload.config'

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

export async function logAudit(data: AuditLogData, payloadInstance?: Payload): Promise<void> {
  try {
    const payload = payloadInstance ?? await getPayload({ config })

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
