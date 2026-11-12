// SEC-027 (matriz de roles): qué debe obtener cada actor en cada sonda y cómo se juzga la respuesta real del CMS.
// Spec: docs/security/SEC-027-MATRIZ-ROLES.md. Fuente de la política: apps/cms/src/access/roles.ts (citada por sonda).
// Qué hace: datos y funciones PURAS (sin red ni base) que usa `probe-roles.ts`; así los jueces se prueban con respuestas
//   sintéticas buenas y malas (tests/unit/sec027-role-matrix.spec.ts).
// Por qué las listas están escritas aquí y no importadas de roles.ts: si la política del código cambia por error, una
//   matriz derivada del mismo código no lo detectaría. Un cambio intencional de permisos debe actualizar AMBOS lados.
// Límite: refleja la política PROVISIONAL vigente (SEC-03 pendiente del Product Owner); no prueba superadmin ni la UI.

export const ACTORS = [
  'anonimo',
  'web-admin',
  'publisher',
  'reviewer',
  'editor',
  'correspondent',
  'media-manager',
  'auditor',
  'viewer',
] as const

export type Actor = (typeof ACTORS)[number]
export type Observed = { status: number; body: any }
/** Datos que el guion conoce: id de la propia cuenta y el rol leído después del intento de escalada (P3). */
export type JudgeContext = { selfId?: number | string; roleAfter?: string }

export interface Probe {
  id: string
  desc: string
  /** Texto corto de lo esperado para el informe. */
  expectation(actor: Actor): string
  judge(actor: Actor, obs: Observed, ctx: JudgeContext): boolean
}

const isDenied = (o: Observed) => o.status === 401 || o.status === 403
const docsOf = (o: Observed): any[] => (Array.isArray(o.body?.docs) ? o.body.docs : [])
const onlySelf = (docs: any[], selfId: JudgeContext['selfId']) =>
  docs.length > 0 && docs.every((d) => String(d?.id) === String(selfId))

/** Sonda permitida solo a `allowed`: los permitidos deben obtener `okStatus`; el resto, 401/403. */
function allowList(id: string, desc: string, allowed: readonly Actor[], okStatus: number, okLabel: string): Probe {
  return {
    id,
    desc,
    expectation: (a) => (allowed.includes(a) ? okLabel : '401/403'),
    judge: (a, o) => (allowed.includes(a) ? o.status === okStatus : isDenied(o)),
  }
}

/** Campos de una cuenta que nadie no superadmin debe recibir de OTRA cuenta (datos personales y de sesión). */
const PRIVATE_USER_KEYS = ['email', 'sessions', 'telefono', 'phone', 'salt', 'hash', 'resetPasswordToken']

const EDITORIAL_READERS: readonly Actor[] = ['web-admin', 'publisher', 'editor', 'reviewer']

export const PROBES: Probe[] = [
  {
    id: 'P1',
    desc: 'GET /api/users',
    expectation: (a) => (a === 'anonimo' ? '401/403' : 'solo su cuenta'),
    judge: (a, o, c) => (a === 'anonimo' ? isDenied(o) : o.status === 200 && onlySelf(docsOf(o), c.selfId)),
  },
  {
    id: 'P2',
    desc: 'POST /api/users (crear cuenta)',
    expectation: () => '401/403',
    judge: (_a, o) => isDenied(o),
  },
  {
    id: 'P3',
    desc: 'PATCH /api/users/<propia> role=superadmin',
    expectation: (a) => (a === 'anonimo' ? '401/403' : 'rol sin cambios'),
    judge: (a, o, c) => (a === 'anonimo' ? isDenied(o) : c.roleAfter === a),
  },
  // canReadAuditLog: MONITORING_ROLES = superadmin, auditor.
  allowList('P4', 'GET /api/auditoria', ['auditor'], 200, '200'),
  // canUpdateGlobal: superadmin, web-admin.
  allowList('P5', 'POST /api/globals/navegacion (mismo contenido)', ['web-admin'], 200, '200'),
  // editorialAuthorRoles('noticias'): superadmin, editor, correspondent.
  allowList('P6', 'POST /api/noticias (borrador)', ['editor', 'correspondent'], 201, '201'),
  // canDeleteEditorial: superadmin, web-admin, publisher. Id inexistente: el permitido llega a 404 sin borrar nada.
  allowList('P7', 'DELETE /api/noticias/<inexistente>', ['web-admin', 'publisher'], 404, '404'),
  // canDeleteMedia: superadmin, web-admin, media-manager.
  allowList('P8', 'DELETE /api/media/<inexistente>', ['web-admin', 'media-manager'], 404, '404'),
  {
    // EDITORIAL_READ_ROLES ven borradores; el corresponsal solo los propios (el borrador de la sonda es del editor).
    id: 'P9',
    desc: 'GET /api/noticias/<borrador ajeno>?draft=true',
    expectation: (a) => (EDITORIAL_READERS.includes(a) ? '200' : '403/404'),
    judge: (a, o) => (EDITORIAL_READERS.includes(a) ? o.status === 200 : o.status === 404 || isDenied(o)),
  },
  {
    // canReadEditorialAuthorship oculta `createdBy` al público; canReadUsers limita la lectura de cuentas a la propia.
    id: 'P10',
    desc: 'GET /api/noticias/<publicada>?depth=1 (datos del creador)',
    expectation: (a) => (a === 'anonimo' ? 'sin createdBy' : 'sin correo/sesiones/teléfono ajenos'),
    judge: (a, o) => {
      if (o.status !== 200) return false
      const cb = o.body?.createdBy
      if (a === 'anonimo') return cb === undefined || cb === null
      if (cb === null || typeof cb !== 'object') return true
      return !PRIVATE_USER_KEYS.some((k) => k in cb)
    },
  },
  {
    id: 'P11',
    desc: 'GraphQL Users { docs { id email } }',
    // GraphQL está desactivado (payload.config.ts, `graphQL.disable`): 404 = sin superficie y sin datos. Si se reactiva,
    // la sonda vuelve a exigir que cada rol vea solo su cuenta y el anónimo nada.
    expectation: (a) => (a === 'anonimo' ? '404 o sin datos' : '404 o solo su cuenta'),
    judge: (a, o, c) => {
      if (o.status === 404) return true
      const docs: any[] = o.body?.data?.Users?.docs ?? []
      return a === 'anonimo' ? docs.length === 0 : onlySelf(docs, c.selfId)
    },
  },
]
