/**
 * smoke-menu-pagina.mjs — MENU-CMS-02 (spec: docs/specs/portal/MENU-PAGINAS.md §5)
 *
 * Prueba de punta a punta de «página del CMS → megamenú del portal», con las tres identidades del flujo editorial:
 *   1. Abre sesión como autor (superadmin), revisor y publicador y comprueba roles e identidades distintas.
 *   2. Si Navegación está vacía, carga el menú actual (misma siembra que `seed-navegacion.mjs`).
 *   3. Crea una página de prueba en Borrador y comprueba que Navegación RECHAZA enlazarla así (400).
 *   4. La lleva por el flujo: autor → en_revision, revisor → aprobado, publicador → publicado.
 *   5. La agrega al final del menú y espera a ver `href="/<slug>"` en la portada y la página en `/<slug>`.
 *   6. Limpieza (siempre, salvo --keep): devuelve el menú a como estaba y borra la página.
 *
 * Uso:
 *   node scripts/smoke-menu-pagina.mjs                     # sin red: describe el recorrido
 *   CMS_EMAIL=... CMS_PASSWORD=... CMS_REVIEWER_EMAIL=... CMS_REVIEWER_PASSWORD=... \
 *     CMS_PUBLISHER_EMAIL=... CMS_PUBLISHER_PASSWORD=... node scripts/smoke-menu-pagina.mjs --apply
 *   ... --apply --keep            # no limpia: deja la página publicada y el enlace para revisarlos a mano
 *   ... --apply --allow-remote    # CMS_URL y PORTAL_URL https explícitos (por ejemplo, staging)
 *
 * Reglas (amenaza -> control):
 *   - Basura publicada o menú alterado -> la limpieza corre en `finally`, también si un paso falla; el menú se restaura con
 *     la copia tomada al empezar (después de la siembra, que sí se conserva porque es el estado esperado).
 *   - Escribir en un destino equivocado -> CMS y portal solo locales salvo --allow-remote, y entonces solo https.
 *   - Publicar con una sola identidad -> `checkIdentities` exige tres cuentas distintas con sus roles.
 *   - Filtrar credenciales -> no se imprime ninguna contraseña ni token.
 * Límite: si otra persona edita el menú mientras corre, la restauración pisa ese cambio. Úselo en local o en staging.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession, isLocalCmsUrl } from './seed-glosario-guarani.mjs'
import { NAVEGACION_SEED } from './lib/navegacionSeedData.mjs'
import { buildDraftPayload, buildStepBody, checkIdentities } from './lib/wpPublishFlow.mjs'

const POLL_DELAY_MS = 3000

/** Estado HTTP más el mensaje que devuelve el CMS (`errors[].message`), recortado. Sin él, «HTTP 400» no dice qué falló. */
function cmsError(res) {
  const errors = Array.isArray(res.data?.errors) ? res.data.errors : []
  const detail = errors.map((e) => [e?.message, ...(e?.data?.errors ?? []).map((d) => `${d?.path}: ${d?.message}`)].filter(Boolean).join(' · ')).join(' | ')
  return `HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`
}

/** Valida un destino: local siempre; remoto solo con allowRemote y https. Se llama antes de cualquier petición. */
function checkTarget(kind, url, allowRemote) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`URL del ${kind} inválida: ${url}`)
  }
  if (isLocalCmsUrl(url)) return url
  if (!allowRemote) throw new Error(`Este guion solo trabaja con un ${kind} local; destino rechazado: ${url}. Use --allow-remote para un destino https.`)
  if (parsed.protocol !== 'https:') throw new Error(`Con --allow-remote el ${kind} debe usar https.`)
  return url
}

/** Abre la sesión de una identidad reutilizando la política de `openCmsSession` y devuelve `{ api, user }`. */
async function openIdentity({ cmsUrl, email, password, allowRemote, doFetch, log }) {
  const env = { CMS_URL: cmsUrl, CMS_EMAIL: email ?? '', CMS_PASSWORD: password ?? '' }
  const { api } = await openCmsSession({ allowRemote, env, doFetch, log: () => {} })
  const me = await api('GET', 'users/me')
  log(`  · sesión abierta (${me.data?.user?.role ?? 'rol desconocido'})`)
  return { api, user: me.data?.user ?? null }
}

/** Ejecuta el recorrido. `deps` inyecta env, fetch, log, sleep, now y pollAttempts (pruebas). Por defecto no hace red. */
export async function run({ apply = false, allowRemote = false, keep = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const now = deps.now ?? (() => Date.now())
  const pollAttempts = deps.pollAttempts ?? 30

  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
  const portalUrl = (env.PORTAL_URL || 'http://localhost:3000').replace(/\/+$/, '')

  if (!apply) {
    log(`[sin escribir] CMS: ${cmsUrl} · portal: ${portalUrl} (sin llamadas de red). Use --apply para correr el recorrido.`)
    log('[sin escribir] pasos: identidades → siembra si el menú está vacío → página en borrador → Navegación la rechaza →')
    log('[sin escribir]        en_revision → aprobado → publicado → enlace en el menú → portal lo muestra → limpieza')
    return { dryRun: true, ok: true, checks: [] }
  }

  checkTarget('CMS', cmsUrl, allowRemote)
  checkTarget('portal', portalUrl, allowRemote)

  const checks = []
  const check = (name, ok, detail = '') => {
    checks.push({ name, ok, detail })
    log(`  ${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
    return ok
  }

  log('Identidades:')
  const author = await openIdentity({ cmsUrl, email: env.CMS_EMAIL, password: env.CMS_PASSWORD, allowRemote, doFetch, log })
  const reviewer = await openIdentity({ cmsUrl, email: env.CMS_REVIEWER_EMAIL, password: env.CMS_REVIEWER_PASSWORD, allowRemote, doFetch, log })
  const publisher = await openIdentity({ cmsUrl, email: env.CMS_PUBLISHER_EMAIL, password: env.CMS_PUBLISHER_PASSWORD, allowRemote, doFetch, log })
  const ids = checkIdentities({ author: author.user, reviewer: reviewer.user, publisher: publisher.user })
  const problems = [...ids.problems]
  if (ids.mode !== 'full') problems.push('Faltan el revisor y el publicador.')
  // El autor edita Navegación (canUpdateGlobal) y borra la página de prueba (canDeleteEditorial).
  if (author.user?.role !== 'superadmin') problems.push('El autor debe ser superadmin (edita Navegación y borra la página de prueba).')
  if (!check('identidades', problems.length === 0, problems.join(' '))) return { dryRun: false, ok: false, checks, seeded: false }

  // Menú de partida: si está vacío se siembra (con un solo enlace el portal reemplazaría el menú completo).
  let seeded = false
  const current = await author.api('GET', 'globals/navegacion?depth=0')
  if (!current.ok) throw new Error(`No se pudo leer Navegación (${cmsError(current)}).`)
  if ((current.data.links ?? []).length === 0) {
    const seed = await author.api('POST', 'globals/navegacion', { links: NAVEGACION_SEED })
    if (!seed.ok) throw new Error(`No se pudo cargar el menú inicial (${cmsError(seed)}).`)
    seeded = true
    log('  · Navegación estaba vacía: se cargó el menú actual (queda cargado).')
  }
  const snapshot = (await author.api('GET', 'globals/navegacion?depth=0')).data.links ?? []

  const slug = `prueba-menu-${now()}`
  const label = 'Prueba de menú'
  let pageId = null
  let menuChanged = false
  try {
    const created = await author.api('POST', 'paginas', buildDraftPayload({ title: 'Prueba de menú (se borra sola)', slug, layout: [] }))
    pageId = created.data?.doc?.id ?? null
    if (!check('pagina_creada', created.ok && pageId !== null, created.ok ? `/${slug}` : cmsError(created))) return { dryRun: false, ok: false, checks, seeded }

    const link = { label, type: 'relationship', page: pageId, newTab: false }
    const draftTry = await author.api('POST', 'globals/navegacion', { links: [...snapshot, link] })
    if (draftTry.ok) menuChanged = true
    check('rechaza_borrador', draftTry.status === 400, `HTTP ${draftTry.status}`)

    const steps = [
      [author, 'en_revision'],
      [reviewer, 'aprobado'],
      [publisher, 'publicado'],
    ]
    let flowOk = true
    let flowDetail = 'publicada'
    for (const [who, to] of steps) {
      const res = await who.api('PATCH', `paginas/${pageId}`, buildStepBody(to))
      if (!res.ok) {
        flowOk = false
        flowDetail = `falló el paso a ${to} (${cmsError(res)})`
        break
      }
    }
    if (!check('flujo_editorial', flowOk, flowDetail)) return { dryRun: false, ok: false, checks, seeded }

    const added = await author.api('POST', 'globals/navegacion', { links: [...snapshot, link] })
    if (added.ok) menuChanged = true
    if (!check('enlace_agregado', added.ok, cmsError(added))) return { dryRun: false, ok: false, checks, seeded }

    // El portal se actualiza por revalidación de etiquetas; se espera hasta ~90 s antes de darlo por fallido.
    let seen = false
    for (let i = 0; i < pollAttempts && !seen; i++) {
      if (i > 0) await sleep(POLL_DELAY_MS)
      const home = await doFetch(`${portalUrl}/`, { redirect: 'follow' })
      seen = home.ok && (await home.text()).includes(`href="/${slug}"`)
    }
    check('portal_muestra_enlace', seen, seen ? `href="/${slug}"` : 'el enlace no apareció en la portada')
    const page = await doFetch(`${portalUrl}/${slug}`, { redirect: 'follow' })
    check('portal_muestra_pagina', page.ok, `HTTP ${page.status}`)
  } finally {
    if (keep) {
      log(`  · --keep: se dejan la página /${slug} y el enlace «${label}».`)
    } else {
      log('Limpieza:')
      if (menuChanged) {
        const restored = await author.api('POST', 'globals/navegacion', { links: snapshot })
        check('menu_restaurado', restored.ok, cmsError(restored))
      } else {
        check('menu_restaurado', true, 'el menú no se modificó')
      }
      if (pageId !== null) {
        const deleted = await author.api('DELETE', `paginas/${pageId}`)
        check('pagina_borrada', deleted.ok, cmsError(deleted))
      }
    }
  }
  const ok = checks.every((c) => c.ok)
  log('')
  log(`Resultado: ${ok ? 'TODO BIEN' : 'HAY FALLOS'} (${checks.filter((c) => c.ok).length}/${checks.length} comprobaciones)`)
  return { dryRun: false, ok, checks, seeded }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote'), keep: args.includes('--keep') })
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((e) => {
      console.error(`Error: ${e.message}`)
      process.exit(1)
    })
}
