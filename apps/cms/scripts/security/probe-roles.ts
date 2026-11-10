/**
 * probe-roles.ts — SEC-027, matriz de roles con cuentas reales (spec: docs/security/SEC-027-MATRIZ-ROLES.md)
 *
 * Qué hace: crea en el CMS LOCAL una cuenta sintética por rol no superadmin (`sonda-<rol>@example.invalid`, contraseña
 *   aleatoria que solo vive en memoria), inicia sesión con cada una, ejecuta las sondas P1–P11 de `roleMatrix.ts` por REST
 *   y GraphQL (también como anónimo), imprime la matriz observada y SIEMPRE borra las cuentas y lo que hayan creado.
 * Por qué existe: la adenda SEC-027 del 07-11 solo tenía revisión con superadmin; faltaban los casos que deben dar 401/403.
 * Amenazas que evita: probar contra un destino equivocado (solo localhost), dejar cuentas con permisos en la base (limpieza
 *   en `finally` y `--cleanup`), filtrar credenciales (no se imprimen ni se escriben en disco).
 * Límites: no prueba superadmin ni la UI; no cubre staging/producción (requieren autorización aparte).
 *
 * Uso (desde la raíz del repo, con el CMS local en marcha):
 *   npx tsx apps/cms/scripts/security/probe-roles.ts            # sin cambios: muestra el plan
 *   npx tsx apps/cms/scripts/security/probe-roles.ts --apply    # crea cuentas, sondea, informa y limpia
 *   npx tsx apps/cms/scripts/security/probe-roles.ts --cleanup  # solo limpia restos de una corrida cortada
 */
import { config as loadEnv } from 'dotenv'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload, type Payload } from 'payload'
import { ACTORS, PROBES, type Actor, type Observed } from './roleMatrix'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })

const CMS_URL = (process.env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
const EMAIL_DOMAIN = '@example.invalid'
const PREFIX = 'sonda-'
const MISSING_ID = 999999999

/** Solo hosts locales: las sondas intentan acciones prohibidas a propósito. */
function assertLocal(url: string): void {
  const host = new URL(url).hostname
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error(`Este guion solo sondea un CMS local; destino rechazado: ${url}`)
  }
}

type Session = { actor: Actor; token?: string; id?: number | string }

async function http(method: string, endpoint: string, token?: string, body?: unknown): Promise<Observed> {
  const res = await fetch(`${CMS_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: any = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = {}
  }
  return { status: res.status, body: parsed }
}

/** Borra todo lo que deja una corrida: cuentas `sonda-*` y noticias `sonda-*` (Local API, sin pasar por permisos). */
async function cleanup(payload: Payload, log: (m: string) => void): Promise<void> {
  // Doble filtro: el prefijo Y una marca que solo pone este guion (dominio reservado `.invalid`, título de sonda).
  const news = await payload.delete({
    collection: 'noticias',
    where: { and: [{ slug: { like: PREFIX } }, { title: { like: 'Sonda de permisos' } }] },
    overrideAccess: true,
  })
  const users = await payload.delete({
    collection: 'users',
    where: { and: [{ email: { like: PREFIX } }, { email: { like: EMAIL_DOMAIN } }] },
    overrideAccess: true,
  })
  log(`Limpieza: ${news.docs.length} noticia(s) y ${users.docs.length} cuenta(s) de sonda borradas.`)
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const onlyCleanup = args.includes('--cleanup')
  const log = (m: string) => console.log(m)
  assertLocal(CMS_URL)

  if (!apply && !onlyCleanup) {
    log(`[sin cambios] CMS: ${CMS_URL}. Actores: ${ACTORS.join(', ')}.`)
    for (const p of PROBES) log(`  ${p.id} ${p.desc}`)
    log('Use --apply para crear las cuentas de sonda, ejecutar y limpiar.')
    return 0
  }

  const configModule = await import('../../src/payload.config.js')
  const payload = await getPayload({ config: configModule.default })
  if (onlyCleanup) {
    await cleanup(payload, log)
    return 0
  }

  const sessions: Session[] = [{ actor: 'anonimo' }]
  let failures = 0
  try {
    await cleanup(payload, () => {}) // restos de una corrida anterior
    for (const actor of ACTORS) {
      if (actor === 'anonimo') continue
      const email = `${PREFIX}${actor}${EMAIL_DOMAIN}`
      const password = `${randomBytes(24).toString('base64url')}Aa1!`
      const user = await payload.create({ collection: 'users', data: { email, password, role: actor } as any, overrideAccess: true })
      const login = await http('POST', '/api/users/login', undefined, { email, password })
      if (!login.body?.token) throw new Error(`No se pudo iniciar sesión con la cuenta de sonda ${actor} (HTTP ${login.status}).`)
      sessions.push({ actor, token: login.body.token, id: user.id })
    }
    log(`Cuentas de sonda: ${sessions.length - 1} creadas e iniciadas.`)

    const published = await payload.find({ collection: 'noticias', where: { _status: { equals: 'published' } }, limit: 1, depth: 0, overrideAccess: true })
    const publishedId = published.docs[0]?.id
    if (publishedId === undefined) throw new Error('No hay noticias publicadas para la sonda P10.')
    const nav = await http('GET', '/api/globals/navegacion?depth=0')
    const stamp = Date.now()

    // P6 va primero: el borrador que crea el editor es el «borrador ajeno» de P9.
    let draftId: number | string | undefined
    const results: Record<string, Record<string, { ok: boolean; status: number }>> = {}
    const record = (probeId: string, actor: Actor, ok: boolean, status: number) => {
      results[probeId] ??= {}
      results[probeId][actor] = { ok, status }
      if (!ok) failures++
    }
    const P = (id: string) => PROBES.find((p) => p.id === id)!

    for (const s of sessions) {
      const obs = await http('POST', '/api/noticias', s.token, {
        title: `Sonda de permisos ${s.actor}`,
        slug: `${PREFIX}${s.actor}-${stamp}`,
        summary: 'Noticia creada por la sonda automática de permisos; se borra al terminar.',
        category: 'institucional',
        content: { root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [{ type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', children: [{ type: 'text', text: 'Sonda', format: 0, detail: 0, mode: 'normal', style: '', version: 1 }] }] } },
        approvalStatus: 'draft',
        _status: 'draft',
      })
      record('P6', s.actor, P('P6').judge(s.actor, obs, {}), obs.status)
      if (s.actor === 'editor' && obs.status === 201) draftId = obs.body?.doc?.id
    }
    if (draftId === undefined) throw new Error('El editor no pudo crear el borrador de prueba (P6); P9 no se puede evaluar.')

    for (const s of sessions) {
      const ctx = { selfId: s.id }
      const run = async (id: string, method: string, endpoint: string, body?: unknown, extra: Record<string, unknown> = {}) => {
        const obs = await http(method, endpoint, s.token, body)
        record(id, s.actor, P(id).judge(s.actor, obs, { ...ctx, ...extra }), obs.status)
        return obs
      }
      await run('P1', 'GET', '/api/users?limit=100&depth=0')
      await run('P2', 'POST', '/api/users', { email: `${PREFIX}creada-${s.actor}${EMAIL_DOMAIN}`, password: `${randomBytes(24).toString('base64url')}Aa1!`, role: 'viewer' })
      if (s.actor === 'anonimo') {
        await run('P3', 'PATCH', `/api/users/${sessions[1]?.id}`, { role: 'superadmin' })
      } else {
        const obs = await http('PATCH', `/api/users/${s.id}`, s.token, { role: 'superadmin' })
        const after = await payload.findByID({ collection: 'users', id: s.id!, depth: 0, overrideAccess: true })
        record('P3', s.actor, P('P3').judge(s.actor, obs, { ...ctx, roleAfter: (after as any).role }), obs.status)
      }
      await run('P4', 'GET', '/api/auditoria?limit=1&depth=0')
      await run('P5', 'POST', '/api/globals/navegacion', { links: nav.body?.links ?? [] })
      await run('P7', 'DELETE', `/api/noticias/${MISSING_ID}`)
      await run('P8', 'DELETE', `/api/media/${MISSING_ID}`)
      await run('P9', 'GET', `/api/noticias/${draftId}?draft=true&depth=0`)
      await run('P10', 'GET', `/api/noticias/${publishedId}?depth=1`)
      await run('P11', 'POST', '/api/graphql', { query: '{ Users(limit: 100) { docs { id email } } }' })
    }

    log('')
    log(`Matriz observada (✔ cumple / ✘ falla, con el código HTTP):`)
    log(`| Sonda | ${ACTORS.join(' | ')} |`)
    log(`| --- | ${ACTORS.map(() => '---').join(' | ')} |`)
    for (const p of PROBES) {
      const row = ACTORS.map((a) => {
        const r = results[p.id]?.[a]
        return r ? `${r.ok ? '✔' : '✘'} ${r.status}` : '—'
      })
      log(`| ${p.id} | ${row.join(' | ')} |`)
    }
    log('')
    for (const p of PROBES) {
      for (const a of ACTORS) {
        const r = results[p.id]?.[a]
        if (r && !r.ok) log(`  ✘ ${p.id} ${p.desc} — ${a}: esperado ${p.expectation(a)}, obtenido HTTP ${r.status}`)
      }
    }
    log(`Resultado: ${failures === 0 ? 'TODO CUMPLE' : `${failures} incumplimiento(s)`}.`)
  } finally {
    await cleanup(payload, log)
  }
  return failures === 0 ? 0 : 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  })
