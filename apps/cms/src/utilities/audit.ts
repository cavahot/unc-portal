import type { PayloadRequest } from 'payload'
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
  cambiosRelevantes?: Record<string, any>
}

export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    const payload = await getPayload({ config })

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

export function extractChanges(before: any, after: any): Record<string, any> {
  const changes: Record<string, any> = {}

  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = {
        antes: before[key],
        despues: after[key],
      }
    }
  }

  return Object.keys(changes).length > 0 ? changes : {}
}
