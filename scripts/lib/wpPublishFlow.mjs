/**
 * MIG-WP: lógica PURA del flujo editorial del importador WordPress -> Payload (SEC-03 / DEP-03).
 * Amenaza que evita: intentar publicar de golpe (el hook responde 422) o «arreglarlo» saltándose la
 * política. La matriz real exige draft -> en_revision (autor) -> aprobado (revisor) -> publicado
 * (publicador), y «nadie aprueba ni publica lo propio»: hacen falta tres identidades distintas.
 * Límite: no hace red ni conoce el CMS; el hook del servidor sigue siendo quien decide.
 */

/** Roles que el servidor acepta en cada paso (apps/cms/src/access/roles.ts). */
const AUTHOR_ROLES = ['superadmin', 'editor', 'correspondent']
const REVIEWER_ROLES = ['reviewer']
const PUBLISHER_ROLES = ['superadmin', 'publisher']

/** Secuencia legal de transiciones, en orden. */
const STEPS = [
  { actor: 'author', from: 'draft', to: 'en_revision' },
  { actor: 'reviewer', from: 'en_revision', to: 'aprobado' },
  { actor: 'publisher', from: 'aprobado', to: 'publicado' },
]

/**
 * Carga de creación: el contenido nace SIEMPRE en Borrador. Ignora cualquier estado publicado de la
 * entrada (el hook rechaza crear contenido ya publicado). La fecha de WordPress (publishedAt) no se toca.
 */
export function buildDraftPayload(input) {
  return { ...input, approvalStatus: 'draft', _status: 'draft' }
}

/**
 * Cuerpo mínimo de cada transición: solo campos de estado. El revisor y el publicador no cambian
 * contenido (el servidor lo restaura del original), así que publishedAt se conserva.
 */
export function buildStepBody(to) {
  if (to === 'en_revision' || to === 'aprobado') return { approvalStatus: to, _status: 'draft' }
  if (to === 'publicado') return { approvalStatus: 'publicado', _status: 'published' }
  throw new Error(`Destino editorial desconocido: ${to}`)
}

/**
 * Pasos que faltan según el estado ACTUAL del documento (reanudación de una corrida interrumpida).
 * Los heredados sin approvalStatus se derivan de _status. «rechazado» queda bloqueado: devolverlo a
 * Borrador y reenviarlo es una decisión humana, no del importador.
 */
export function remainingSteps(doc) {
  const state = doc?.approvalStatus ?? (doc?._status === 'published' ? 'publicado' : 'draft')
  if (state === 'publicado') return { steps: [] }
  if (state === 'rechazado') return { steps: [], blocked: 'La noticia está rechazada: requiere decisión editorial humana.' }
  const index = STEPS.findIndex((step) => step.from === state)
  if (index === -1) return { steps: [], blocked: `Estado editorial desconocido: ${String(state)}` }
  return { steps: STEPS.slice(index).map((step) => ({ ...step, body: buildStepBody(step.to) })) }
}

/**
 * Verifica UNA vez, antes de procesar, las identidades obtenidas de GET /api/users/me ({ id, role }).
 * Sin revisor ni publicador -> modo solo borradores. Con ambos -> modo completo: roles válidos e ids
 * distintos entre las tres identidades. Definir solo uno de los dos es un error de configuración.
 */
export function checkIdentities({ author, reviewer, publisher }) {
  const problems = []
  if (!author || !AUTHOR_ROLES.includes(author.role)) {
    problems.push(`El autor debe tener uno de los roles ${AUTHOR_ROLES.join('/')}.`)
  }
  if (!reviewer && !publisher) return { ok: problems.length === 0, mode: 'draft-only', problems }
  if (!reviewer) problems.push('Falta el revisor: defina CMS_REVIEWER_EMAIL y CMS_REVIEWER_PASSWORD.')
  if (!publisher) problems.push('Falta el publicador: defina CMS_PUBLISHER_EMAIL y CMS_PUBLISHER_PASSWORD.')
  if (reviewer && !REVIEWER_ROLES.includes(reviewer.role)) problems.push('El revisor debe tener el rol reviewer.')
  if (publisher && !PUBLISHER_ROLES.includes(publisher.role)) problems.push('El publicador debe tener el rol publisher o superadmin.')
  if (reviewer && publisher && author) {
    const ids = [author.id, reviewer.id, publisher.id].map(String)
    if (new Set(ids).size !== ids.length) {
      problems.push('Las tres identidades deben ser distintas (nadie aprueba ni publica lo propio).')
    }
  }
  return { ok: problems.length === 0, mode: 'full', problems }
}
