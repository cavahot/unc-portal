/**
 * seed-reconocimientos-acreditaciones.mjs — PRA-01 (fase CMS)
 *
 * Siembra en el CMS: (1) el Premio Nacional a la Calidad con sus ediciones, (2) las acreditaciones
 * ANEAES con fuente, (3) siglas y logoPath de las 6 facultades. Datos en scripts/lib/premiosAcreditacionesData.mjs.
 * Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §11.
 *
 * Uso:
 *   node scripts/seed-reconocimientos-acreditaciones.mjs --dry-run      # sin red: muestra qué haría
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-reconocimientos-acreditaciones.mjs
 *
 * Reglas de seguridad (amenaza → control):
 *   - Escribir en un CMS equivocado (staging/producción) → solo se ejecuta contra localhost/127.0.0.1/[::1].
 *   - Credencial débil o literal → `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL; nada se imprime.
 *   - Publicar datos sin confirmar → todo se crea con active=false y verificado=false (lo fuerza el módulo de datos).
 *   - Pisar ediciones del PO al re-ejecutar → idempotente: si la fila existe por su clave natural NO se toca;
 *     en facultades solo se completan siglas/logoPath cuando están vacíos.
 *   - Facultades: solo se crean (mínimas: nombre + activa) si faltan y únicamente en una BD local.
 * Límite: no sube archivos a `media` ni consulta a CONACYT/ANEAES; el logo debe existir ya en `public/`.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import {
  ACREDITACIONES,
  FACULTADES,
  RECONOCIMIENTOS,
  toCmsPayloadAcreditacion,
  toCmsPayloadReconocimiento,
} from './lib/premiosAcreditacionesData.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACE_MS = 150

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** true solo para hosts de desarrollo local: el guion nunca escribe en otro CMS. */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/** Plan sin red: cuántas filas intentaría crear/actualizar. Lo usan --dry-run y las pruebas. */
export function buildPlan({ logoExists = true } = {}) {
  return {
    reconocimientos: RECONOCIMIENTOS.length,
    ediciones: RECONOCIMIENTOS.reduce((n, r) => n + r.ediciones.length, 0),
    acreditaciones: ACREDITACIONES.length,
    facultades: FACULTADES.length,
    acreditacionesConFacultad: ACREDITACIONES.filter((a) => a.facultadSlug).length,
    logoPremio: logoExists ? 'presente' : 'pendiente (el PO debe aportar el archivo)',
  }
}

/**
 * Ejecuta la siembra. `deps` permite inyectar `fetch`, `env`, `logoExists` y `log` (pruebas).
 * Devuelve los contadores. Con `dryRun` NO llama a la red ni exige credenciales.
 */
export async function run({ dryRun = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
  const logoExists =
    deps.logoExists ?? existsSync(path.join(ROOT, 'public', RECONOCIMIENTOS[0].logoPath.replace(/^\//, '')))

  const counts = {
    reconocimientos: { creados: 0, existentes: 0 },
    acreditaciones: { creadas: 0, existentes: 0 },
    facultades: { creadas: 0, actualizadas: 0, sinCambios: 0 },
    errores: 0,
    logoPremio: logoExists ? 'presente' : 'pendiente',
  }

  if (dryRun) {
    const plan = buildPlan({ logoExists })
    log(`[dry-run] CMS destino: ${cmsUrl} (no se hace ninguna llamada de red)`)
    log(`[dry-run] reconocimientos: ${plan.reconocimientos} (ediciones: ${plan.ediciones}), todos active=false y verificado=false`)
    log(`[dry-run] acreditaciones: ${plan.acreditaciones} (${plan.acreditacionesConFacultad} con facultad respaldada por la fuente), todas active=false y verificado=false`)
    log(`[dry-run] facultades: ${plan.facultades} (siglas y logoPath solo donde están vacíos)`)
    log(`[dry-run] logo del premio: ${plan.logoPremio}`)
    return { dryRun: true, plan }
  }

  if (!isLocalCmsUrl(cmsUrl)) {
    throw new Error(`Este guion solo escribe en un CMS local (localhost/127.0.0.1); destino rechazado: ${cmsUrl}`)
  }
  const email = (env.CMS_EMAIL || '').trim()
  if (!email) throw new Error('Falta CMS_EMAIL (correo del usuario con rol superadmin o web-admin).')
  const password = requireCmsPassword(env)

  // --- sesión ---------------------------------------------------------------------------------
  const loginRes = await doFetch(`${cmsUrl}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const login = await loginRes.json().catch(() => ({}))
  if (!login.token) throw new Error(`No se pudo iniciar sesión en el CMS (HTTP ${loginRes.status}).`)
  const headers = { 'Content-Type': 'application/json', Authorization: `JWT ${login.token}` }
  log(`Sesión iniciada en ${cmsUrl}`)

  const api = async (method, endpoint, body) => {
    const res = await doFetch(`${cmsUrl}/api/${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }
  const findOne = async (collection, query) => {
    const r = await api('GET', `${collection}?${query}&limit=1&depth=0`)
    if (!r.ok) throw new Error(`Consulta a ${collection} falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }
  const q = (k, v) => `where[${k}][equals]=${encodeURIComponent(v)}`

  // --- facultades -----------------------------------------------------------------------------
  const facultadIds = new Map()
  for (const f of FACULTADES) {
    let doc = await findOne('facultades', q('slug', f.slug))
    if (!doc) {
      const r = await api('POST', 'facultades', { nombre: f.nombre, activa: true })
      await pace(PACE_MS)
      if (!r.ok) {
        counts.errores++
        log(`  ! No se pudo crear la facultad «${f.nombre}» (HTTP ${r.status}); se informa y se continúa.`)
        continue
      }
      doc = r.data.doc
      counts.facultades.creadas++
      log(`  + Facultad creada (mínima, solo BD local): ${f.nombre}`)
    }
    facultadIds.set(f.slug, doc.id)
    const patch = {}
    if (f.siglas && !doc.siglas) patch.siglas = f.siglas
    if (f.logoPath && !doc.logoPath) patch.logoPath = f.logoPath
    if (Object.keys(patch).length === 0) {
      counts.facultades.sinCambios++
      continue
    }
    const r = await api('PATCH', `facultades/${doc.id}`, patch)
    await pace(PACE_MS)
    if (r.ok) {
      counts.facultades.actualizadas++
      log(`  ~ ${f.nombre}: ${Object.keys(patch).join(', ')}`)
    } else {
      counts.errores++
      log(`  ! No se pudo actualizar ${f.nombre} (HTTP ${r.status}).`)
    }
  }

  // --- reconocimientos ------------------------------------------------------------------------
  for (const item of RECONOCIMIENTOS) {
    const existing = await findOne('reconocimientos', q('nombre', item.nombre))
    if (existing) {
      counts.reconocimientos.existentes++
      log(`  = Reconocimiento ya existe (no se toca): ${item.nombre}`)
      continue
    }
    const body = toCmsPayloadReconocimiento(item, { includeLogo: logoExists })
    const r = await api('POST', 'reconocimientos', body)
    await pace(PACE_MS)
    if (r.ok) {
      counts.reconocimientos.creados++
      log(`  + Reconocimiento creado (inactivo, sin verificar): ${item.nombre}`)
    } else {
      counts.errores++
      log(`  ! Falló ${item.nombre} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }

  // --- acreditaciones -------------------------------------------------------------------------
  for (const item of ACREDITACIONES) {
    const existing = await findOne('acreditaciones', `${q('programa', item.programa)}&${q('sede', item.sede)}`)
    if (existing) {
      counts.acreditaciones.existentes++
      log(`  = Acreditación ya existe (no se toca): ${item.programa}`)
      continue
    }
    const body = toCmsPayloadAcreditacion(item, item.facultadSlug ? facultadIds.get(item.facultadSlug) : undefined)
    const r = await api('POST', 'acreditaciones', body)
    await pace(PACE_MS)
    if (r.ok) {
      counts.acreditaciones.creadas++
      log(`  + Acreditación creada (inactiva, sin verificar): ${item.programa}`)
    } else {
      counts.errores++
      log(`  ! Falló ${item.programa} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }

  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { dryRun: false, counts }
}

// Ejecución directa (no al importar desde las pruebas).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes('--dry-run') }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
