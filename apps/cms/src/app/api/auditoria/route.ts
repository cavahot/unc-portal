import { getPayload } from 'payload'
import config from '../../../payload.config'
import { MONITORING_ROLES } from '../../../access/roles'
import {
  internalError,
  invalidParameter,
  parseAllowed,
  parseBoundedInt,
  requireRole,
} from '../../../utilities/routeGuard'

export const dynamic = 'force-dynamic'

// DEP-04: listas blancas alineadas con las opciones de la colección `auditoria`.
const ACCIONES = [
  'login', 'logout', 'crear', 'actualizar', 'eliminar', 'publicar', 'cambiar_rol',
  'revisar', 'aprobar', 'rechazar', 'importar', 'revalidar',
] as const
const RESULTADOS = ['exito', 'error', 'advertencia'] as const

/**
 * DEP-04 (RDD-DEP-11): lista el log de auditoría solo a superadmin y auditor.
 * Orden: autenticación y rol → validación de parámetros → consulta con ACL (`overrideAccess:false`
 * + `user`, así `Auditoria.read` también protege esta vía) → errores genéricos.
 * Amenaza: enumeración de emails, IP y cambios por cualquier sesión.
 * Límite: sin rate limit (DEP-06) ni índices (DEP-07).
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    const guard = await requireRole(payload, request, MONITORING_ROLES)
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(request.url)
    const limit = parseBoundedInt(searchParams.get('limit'), { min: 1, max: 200, fallback: 50 })
    if (limit === null) return invalidParameter('limit')
    const page = parseBoundedInt(searchParams.get('page'), { min: 1, max: 10000, fallback: 1 })
    if (page === null) return invalidParameter('page')
    const accion = parseAllowed(searchParams.get('accion'), ACCIONES, undefined)
    if (accion === null) return invalidParameter('accion')
    const resultado = parseAllowed(searchParams.get('resultado'), RESULTADOS, undefined)
    if (resultado === null) return invalidParameter('resultado')
    const usuario = searchParams.get('usuario')
    if (usuario !== null && usuario.length > 254) return invalidParameter('usuario')

    const whereConditions: Record<string, { contains?: string; equals?: string }> = {}
    if (usuario) whereConditions.usuario = { contains: usuario }
    if (accion) whereConditions.accion = { equals: accion }
    if (resultado) whereConditions.resultado = { equals: resultado }

    const logs = await payload.find({
      collection: 'auditoria',
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      sort: '-fechaHora',
      limit,
      page,
      overrideAccess: false,
      user: guard.user,
    })

    return Response.json(logs)
  } catch (error) {
    return internalError('api/auditoria', error, 'Error fetching audit logs')
  }
}
