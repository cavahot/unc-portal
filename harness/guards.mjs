// DEP-00: guards de SOLO LECTURA del informe pre-deploy (AUDIT-DEPLOY-2026-10-19).
// Cada guard es una función pura que recibe contenido ya leído y devuelve
// { id, passed, findings }. Los findings son rutas/líneas/nombres de variable,
// NUNCA valores de secretos. Un guard rojo sobre el repo actual es deuda real:
// no se excluye ni se oculta.
import path from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Construye el resultado estándar; passed se deriva de que no haya findings. */
function result(id, findings) {
  return { id, passed: findings.length === 0, findings }
}

/** Entrada ausente: el guard falla con un finding explícito en vez de lanzar (DEP-00). */
function missing(id, what) {
  return result(id, [`entrada ausente: ${what}`])
}

/** Quita comentarios // y /* *\/ para que un comentario no simule un control real. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// ---------------------------------------------------------------------------
// 1. guard-tracked-secrets (DEP-01, DEP-17)
// ---------------------------------------------------------------------------

/**
 * Detecta dumps, backups, .env reales y restos de edición versionados en git.
 * Amenaza: fuga de PII/credenciales por el historial del repositorio.
 * Límite: solo mira nombres de archivo, no su contenido ni el historial previo.
 */
export function guardTrackedSecrets(trackedFiles) {
  const id = 'guard-tracked-secrets'
  if (!Array.isArray(trackedFiles)) return missing(id, 'lista de git ls-files')
  const findings = []
  for (const file of trackedFiles) {
    const base = file.split('/').pop()
    const isEnv = /^\.env(\.|$)/.test(base) && !base.endsWith('.example')
    const reasons = [
      [base.includes('.dump'), 'dump de base de datos'],
      [/\.bak$/.test(base), 'copia .bak'],
      [base.includes('.backup'), 'copia .backup'],
      [isEnv, 'archivo .env versionado'],
      [base === 'test_write.txt', 'archivo de prueba de escritura'],
      // DEP-17: el patrón antiguo exigía un punto antes de `before-` y no cubría `package.before-x.json`.
      [/^package\.(.*\.)?before-.*\.json$/.test(base), 'respaldo de package.json'],
      [/^package-lock\.(.*\.)?before-.*\.json$/.test(base), 'respaldo de package-lock.json'],
      [file === 'migration-errors.json', 'salida de migración versionada'],
      [/(^|\/)test-results\//.test(file), 'artefacto de pruebas (test-results)'],
      [file === 'apps/cms/test.env', 'env de prueba del CMS'],
    ].find(([hit]) => hit)
    if (reasons) findings.push(`${file} (${reasons[1]})`)
  }
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 2. guard-api-coverage (DEP-06)
// ---------------------------------------------------------------------------

/**
 * Handlers públicos de app/api que deben aplicar el limitador de tasa de DEP-06 dentro
 * del propio handler (el matcher de proxy.ts excluye api/ y no los cubre).
 */
export const RATE_LIMITED_API_ROUTES = [
  'app/api/contact/route.ts',
  'app/api/preview/route.ts',
  'app/api/revalidate/route.ts',
  'app/api/monitoring/route.ts',
]

/**
 * Dos comprobaciones sobre el código sin comentarios:
 * (1) proxy.ts no puede tratar /api/ mientras su matcher excluye api/ (control
 * declarado pero inalcanzable, falsa sensación de protección);
 * (2) DEP-06: cada handler de RATE_LIMITED_API_ROUTES debe importar `security/rateLimit`
 * y llamar a `.check(`. Sin (2), borrar la rama muerta de proxy.ts pondría el guard verde
 * sin protección real. `handlers` = { ruta: contenido }.
 * Límite: análisis textual; no evalúa la regex del matcher ni prueba que el límite sea
 * efectivo (eso lo hacen las pruebas vitest de DEP-06).
 */
export function guardApiCoverage(proxyText, handlers) {
  const id = 'guard-api-coverage'
  if (typeof proxyText !== 'string') return missing(id, 'proxy.ts')
  if (!handlers || typeof handlers !== 'object') return missing(id, 'handlers públicos de app/api')
  const findings = []
  const idx = proxyText.search(/matcher\s*:/)
  if (idx < 0) {
    findings.push('proxy.ts no declara config.matcher')
  } else {
    const logic = stripComments(proxyText.slice(0, idx))
    const matcher = stripComments(proxyText.slice(idx))
    const declaresApi = /\/api\//.test(logic)
    const excludesApi = /[|(]api\//.test(matcher)
    if (declaresApi && excludesApi) {
      findings.push('proxy.ts: la lógica trata /api/ pero el matcher excluye api/ (nunca se ejecuta)')
    }
  }
  for (const file of RATE_LIMITED_API_ROUTES) {
    const content = handlers[file]
    if (typeof content !== 'string' || content === '') {
      findings.push(`${file}: handler ausente`)
      continue
    }
    const code = stripComments(content)
    if (!/security\/rateLimit/.test(code) || !/\.check\(/.test(code)) {
      findings.push(`${file}: no importa y aplica el limitador de tasa (lib/security/rateLimit)`)
    }
  }
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 3. guard-route-roles (DEP-04)
// ---------------------------------------------------------------------------

/**
 * Rutas de apps/cms/src/app/api explícitamente públicas. Una ruta solo entra
 * aquí con decisión documentada.
 * - health (DEP-04, RDD-DEP-12): pública SOLO porque el healthcheck de Docker y el
 *   portal la llaman sin sesión. Límite: el anónimo recibe una respuesta constante
 *   `{status:'ok'}`; el detalle (BD/MinIO/portal) exige superadmin o auditor. Readiness
 *   real y rate limit quedan en DEP-09 y DEP-06.
 * - health/ready (DEP-09, RDD-DEP-27): pública SIN sesión porque la consultan el healthcheck de Docker
 *   y el gate del deploy desde la red interna, donde no hay cookie. Límite: el cuerpo es constante
 *   (`ready` / `unavailable` / `rate_limited`, sin host ni errores), el resultado se cachea 5 s y hay
 *   un limitador por IP (30/min, en memoria por proceso); solo prueba `SELECT 1`, no esquema ni MinIO.
 */
export const PUBLIC_API_ROUTES = [
  'apps/cms/src/app/api/health/route.ts',
  'apps/cms/src/app/api/health/ready/route.ts',
]

/**
 * Patrón de "llamada a guard de rol": hasRole(/requireRole(/canAccess(/
 * checkRole(/assertRole(, o comparaciones sobre user.role / roles.includes.
 * Se evalúa sobre el código sin comentarios.
 */
const ROLE_GUARD_PATTERN = /\b(hasRole|requireRole|canAccess|checkRole|assertRole)\s*\(|\.role\s*(===|!==)|\.roles?\s*\.includes\s*\(|\brole\s*===/

/**
 * Cada route.ts del CMS bajo api/** debe invocar un guard de rol o estar en
 * la lista blanca. Amenaza: endpoints de auditoría/métricas legibles por
 * cualquier sesión (o anónimo). Límite: comprueba presencia del guard, no que
 * cubra todos los métodos HTTP ni que el rol elegido sea el correcto.
 */
export function guardRouteRoles(routes, publicRoutes = PUBLIC_API_ROUTES) {
  const id = 'guard-route-roles'
  if (!routes || typeof routes !== 'object' || Object.keys(routes).length === 0) {
    return missing(id, 'route.ts de apps/cms/src/app/api')
  }
  const findings = Object.entries(routes)
    .filter(([file, content]) => !publicRoutes.includes(file) && !ROLE_GUARD_PATTERN.test(stripComments(content ?? '')))
    .map(([file]) => `${file} (sin guard de rol ni lista blanca)`)
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 4. guard-jsonld (DEP-05)
// ---------------------------------------------------------------------------

/**
 * Detecta dangerouslySetInnerHTML que serializa con JSON.stringify sin pasar
 * por safeJsonLd. Amenaza: XSS almacenado con `</script>` en títulos del CMS.
 * Límite: ventana de 3 líneas desde el uso; comentarios se ignoran.
 */
export function guardJsonld(files) {
  const id = 'guard-jsonld'
  if (!files || typeof files !== 'object') return missing(id, 'archivos de app/ y lib/')
  const findings = []
  for (const [file, content] of Object.entries(files)) {
    const lines = (content ?? '').split('\n')
    lines.forEach((line, i) => {
      if (!line.includes('dangerouslySetInnerHTML') || /^\s*(\*|\/\/|\/\*)/.test(line)) return
      const window = lines.slice(i, i + 3).join(' ')
      if (window.includes('JSON.stringify') && !window.includes('safeJsonLd')) {
        findings.push(`${file}:${i + 1} (JSON.stringify sin safeJsonLd)`)
      }
    })
  }
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 5. guard-env-parity (DEP-10)
// ---------------------------------------------------------------------------

/**
 * DEP-10: excepciones documentadas, UNA ENTRADA POR NOMBRE EXACTO y con razón. No se admiten
 * patrones ni prefijos: una variable que deba llegar a un servicio nunca puede ocultarse aquí
 * (los hallazgos reales se cierran en compose/ejemplo/código). `example: true` = variable de
 * build-time que sí se documenta en .env.prod.example aunque el compose no la interpole.
 * RDD-DEP-37: las leen next.config.mjs / el entorno de CI, no el runtime de los contenedores.
 */
export const ENV_IGNORED = [
  { name: 'NODE_ENV', reason: 'La fija el ENV del Dockerfile y el compose pone production; no es configuración del operador.' },
  { name: 'CI', reason: 'La inyecta el pipeline de GitHub Actions; solo afecta al build (next.config.mjs) y a Playwright.' },
  { name: 'NEXT_PHASE', reason: 'La define Next.js durante el build (phase-production-build); DEP-16 la lee en resolvePayloadSecret para no abortar el build sin secretos; no se configura desde fuera.' },
  { name: 'NEXT_RUNTIME', reason: 'La define Next.js según el runtime (nodejs/edge); no se configura desde fuera.' },
  { name: 'NEXT_TELEMETRY_DISABLED', reason: 'Se fija con ENV en los Dockerfile; no es un ajuste de despliegue.' },
  { name: 'SENTRY_ORG', example: true, reason: 'Build-time: next.config.mjs la usa al subir sourcemaps; llega por build-args desde secrets de GitHub (deploy.yml).' },
  { name: 'SENTRY_PROJECT', example: true, reason: 'Build-time: next.config.mjs la usa al subir sourcemaps; llega por build-args desde secrets de GitHub (deploy.yml).' },
  { name: 'SENTRY_AUTH_TOKEN', example: true, reason: 'Build-time: token de subida de sourcemaps; no debe existir en el runtime del contenedor (DEP-13 lo pasará como secreto de build).' },
]

/** Variables que el pipeline (no .env.prod) entrega al invocar docker compose. */
export const COMPOSE_PROVIDED = [
  { name: 'IMAGE_TAG', reason: 'Lo fija deploy.yml (sha inmutable, DEP-09); el compose falla si falta.' },
]

/**
 * Lee compose.prod.yaml (solo texto, sin parser YAML) y devuelve:
 * - services: objeto nombre -> Set de claves de su `environment`, resolviendo alias YAML
 *   (`x-*: &ancla` + `environment: *ancla`) y bloques literales;
 * - interpolated: Set de nombres usados como ${VAR}, ${VAR:-d} o ${VAR:?m} fuera de comentarios.
 * Límite: solo la forma del archivo actual (mapa, no lista `- K=V`); si cambia, el test del parser falla.
 */
export function parseComposeEnvironments(compose) {
  const anchors = new Map()
  const services = new Map()
  const interpolated = new Set()
  let section = null
  let anchor = null
  let service = null
  let inEnv = false
  for (const raw of String(compose ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    for (const m of line.matchAll(/\$\{([A-Z][A-Z0-9_]*)(?:[:?-][^}]*)?\}/g)) interpolated.add(m[1])
    const indent = raw.length - raw.trimStart().length
    if (indent === 0) {
      anchor = null
      service = null
      inEnv = false
      const a = line.match(/^x-[\w-]+:\s*&([\w-]+)/)
      if (a) {
        anchor = a[1]
        anchors.set(anchor, new Set())
      }
      section = line.startsWith('services:') ? 'services' : 'other'
      continue
    }
    if (anchor) {
      const k = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/)
      if (k) anchors.get(anchor).add(k[1])
      continue
    }
    if (section !== 'services') continue
    if (indent === 2) {
      const s = line.match(/^([\w-]+):\s*$/)
      service = s ? s[1] : null
      if (service) services.set(service, new Set())
      inEnv = false
      continue
    }
    if (!service) continue
    if (indent === 4) {
      inEnv = false
      const e = line.match(/^environment:\s*(.*)$/)
      if (!e) continue
      const rest = e[1].trim()
      if (rest.startsWith('*')) anchors.get(rest.slice(1))?.forEach((k) => services.get(service).add(k))
      else if (rest === '') inEnv = true
      continue
    }
    if (inEnv) {
      const k = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/)
      if (k) services.get(service).add(k[1])
    }
  }
  return { services: Object.fromEntries(services), interpolated }
}

/** Mapa nombre -> primer archivo que lo lee con process.env.NOMBRE (comentarios ignorados). */
function envReads(sources) {
  const vars = new Map()
  for (const [file, content] of Object.entries(sources)) {
    const code = stripComments(content ?? '')
    for (const m of code.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      if (!vars.has(m[1])) vars.set(m[1], file)
    }
    // Falso positivo demostrado (RDD-DEP-32): getDatabaseURL(env = process.env) lee `env.DATABASE_URI`
    // sin escribir `process.env.` en el acceso. Solo se acepta `env.X` en archivos que reciben
    // `process.env` como valor por defecto o alias (`= process.env` sin acceso directo).
    if (/=\s*process\.env\b(?!\s*[.[])/.test(code)) {
      for (const m of code.matchAll(/(?<![\w.])env\.([A-Z][A-Z0-9_]*)/g)) {
        if (!vars.has(m[1])) vars.set(m[1], file)
      }
    }
  }
  return vars
}

/**
 * DEP-10: paridad POR SERVICIO entre código, compose y .env.prod.example.
 * (1) variable leída por el código de portal/CMS => clave del environment de ESE servicio (se resuelve
 *     el ancla x-cms-env); (2) clave del environment que ningún código del servicio lee => rojo (nombre
 *     obsoleto, p. ej. SMTP_FROM); (3) toda ${VAR} del compose figura en el ejemplo; (4) toda variable del
 *     ejemplo se interpola en el compose o es build-time leída por código (sin huérfanas).
 * Amenaza: deploy que arranca con la variable ausente/vacía en el servicio que la lee (correo sin
 * credenciales, revalidación hacia localhost, preview sin secreto). Los nombres que el compose proyecta
 * (NEXT_PUBLIC_SERVER_URL: ${CMS_PUBLIC_URL}) no se exigen en el ejemplo: allí vive el nombre de origen.
 * Límite: solo accesos `process.env.NOMBRE`; no detecta lecturas dinámicas ni desestructuración, ni que
 * un NEXT_PUBLIC_* se incruste en build (RDD-DEP-36). `extraIgnored` = nombres exactos adicionales.
 * `input` = { portalSources, cmsSources, compose, envExample }.
 */
export function guardEnvParity(input, extraIgnored = []) {
  const id = 'guard-env-parity'
  const { portalSources, cmsSources, compose, envExample } = input ?? {}
  if (!portalSources || typeof portalSources !== 'object') return missing(id, 'fuentes de código del portal')
  if (!cmsSources || typeof cmsSources !== 'object') return missing(id, 'fuentes de código del CMS')
  if (typeof compose !== 'string') return missing(id, 'compose.prod.yaml')
  if (typeof envExample !== 'string') return missing(id, '.env.prod.example')
  const ignored = new Set([...ENV_IGNORED.map((e) => e.name), ...extraIgnored])
  const { services, interpolated } = parseComposeEnvironments(compose)
  const reads = { portal: envReads(portalSources), cms: envReads(cmsSources) }
  const findings = []
  for (const svc of ['portal', 'cms']) {
    const keys = services[svc]
    if (!keys) {
      findings.push(`servicio ${svc} ausente o sin environment en compose.prod.yaml`)
      continue
    }
    for (const [name, file] of [...reads[svc]].sort()) {
      if (ignored.has(name) || keys.has(name)) continue
      findings.push(`${name} (leída en ${file}) no llega al servicio ${svc}: falta en su environment de compose.prod.yaml`)
    }
    for (const key of [...keys].sort()) {
      if (ignored.has(key) || reads[svc].has(key)) continue
      findings.push(`${key} está en el environment de ${svc} pero ningún código del servicio la lee (nombre obsoleto o sobrante)`)
    }
  }
  const exampleVars = new Set(
    envExample.split('\n').map((l) => l.match(/^([A-Z][A-Z0-9_]*)=/)).filter(Boolean).map((m) => m[1]),
  )
  const provided = new Set(COMPOSE_PROVIDED.map((e) => e.name))
  for (const name of [...interpolated].sort()) {
    if (!provided.has(name) && !exampleVars.has(name)) findings.push(`${name} se interpola en compose.prod.yaml pero falta en .env.prod.example`)
  }
  const buildTime = new Set(ENV_IGNORED.filter((e) => e.example).map((e) => e.name))
  const allReads = new Set([...reads.portal.keys(), ...reads.cms.keys()])
  for (const name of [...exampleVars].sort()) {
    if (interpolated.has(name) || (buildTime.has(name) && allReads.has(name))) continue
    findings.push(`${name} está en .env.prod.example pero es huérfana: ni el compose la interpola ni un código la lee en build`)
  }
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 6. guard-deploy-steps (DEP-07, DEP-09, DEP-11)
// ---------------------------------------------------------------------------

/**
 * El workflow de deploy debe tener migración, backup previo y rollback; el
 * compose de producción no puede usar `:latest`. Amenaza: deploy sin retorno
 * y imágenes no reproducibles. Límite: busca palabras clave (migrate,
 * pg_dump|backup, rollback), no valida el orden ni que los pasos funcionen.
 */
export function guardDeploySteps(input) {
  const id = 'guard-deploy-steps'
  const { workflow, compose } = input ?? {}
  if (typeof workflow !== 'string') return missing(id, '.github/workflows/deploy.yml')
  if (typeof compose !== 'string') return missing(id, 'compose.prod.yaml')
  const findings = []
  if (!/migrate/i.test(workflow)) findings.push('deploy.yml: falta paso de migración')
  if (!/pg_dump|backup/i.test(workflow)) findings.push('deploy.yml: falta backup previo')
  if (!/rollback/i.test(workflow)) findings.push('deploy.yml: falta rollback')
  compose.split('\n').forEach((line, i) => {
    // DEP-09: también el default `${VAR:-latest}` cuenta como referencia a latest.
    if (/:-?latest\b/.test(line) && !/^\s*#/.test(line)) findings.push(`compose.prod.yaml:${i + 1} usa :latest`)
  })
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 7. guard-i18n-parity (DEP-15)
// ---------------------------------------------------------------------------

/**
 * DEP-15: comprueba (textualmente, sin ejecutar) que existe el fallback por
 * archivo a `es`: el cargador declara `I18N_FALLBACK_LOCALE = 'es'` (fuera de
 * comentarios) y `i18n/request.ts` invoca `loadMessages(`. Límite: no prueba el
 * runtime; eso lo hace tests/unit/i18n-fallback.spec.ts.
 */
function hasDeclaredFileFallback(fallback) {
  if (!fallback || typeof fallback.loader !== 'string' || typeof fallback.request !== 'string') return false
  const loader = stripComments(fallback.loader)
  const request = stripComments(fallback.request)
  return /I18N_FALLBACK_LOCALE\s*=\s*['"]es['"]/.test(loader) && /loadMessages\s*\(/.test(request)
}

/**
 * Compara los nombres de archivo de messages/<locale> contra la unión de todos
 * los locales. Amenaza: páginas rotas o claves en blanco en un idioma.
 * Regla (DEP-15): un archivo faltante es ROJO salvo que el código declare y use
 * el fallback por archivo a `es` (`fallback`); entonces pasa y se reporta en
 * `informational` como deuda de traducción. Un directorio de locale ausente es
 * siempre rojo. Límite: solo nombres de archivo, no claves internas (sin
 * fallback por clave).
 * `byLocale` = { es: [...], en: [...] | null, ... }; `fallback` = { loader, request } (fuentes).
 */
export function guardI18nParity(byLocale, fallback) {
  const id = 'guard-i18n-parity'
  if (!byLocale || typeof byLocale !== 'object') return missing(id, 'directorios messages/')
  const covered = hasDeclaredFileFallback(fallback)
  const findings = []
  const informational = []
  const union = new Set()
  for (const [locale, names] of Object.entries(byLocale)) {
    if (!Array.isArray(names)) findings.push(`${locale}: directorio ausente`)
    else names.forEach((n) => union.add(n))
  }
  for (const [locale, names] of Object.entries(byLocale)) {
    if (!Array.isArray(names)) continue
    for (const name of [...union].sort()) {
      if (names.includes(name)) continue
      if (covered) informational.push(`${locale}: falta ${name} (fallback a es)`)
      else findings.push(`${locale}: falta ${name}`)
    }
  }
  return { ...result(id, findings), informational }
}

// ---------------------------------------------------------------------------
// 8. guard-secret-required (DEP-16)
// ---------------------------------------------------------------------------

/**
 * payload.config.ts no puede caer a cadena vacía si falta un secreto.
 * Amenaza: firmar sesiones/JWT/preview con secreto vacío. DEP-16: además de `PAYLOAD_SECRET`
 * cubre `PREVIEW_SECRET` y `REVALIDATION_SECRET`, y la propiedad `secret: ''` literal. El cierre
 * real es `resolvePayloadSecret()` (apps/cms/src/config/secrets.ts), que pasa por ausencia de
 * fallbacks vacíos. Límite: detecta `|| ''` / `?? ''` y `secret: ''` literales (líneas de
 * comentario ignoradas); no otros fallbacks débiles ni prueba el comportamiento (eso lo hacen las pruebas
 * vitest de DEP-16). Los hallazgos citan archivo:línea y nombre, nunca valores.
 */
export function guardSecretRequired(payloadConfig) {
  const id = 'guard-secret-required'
  if (typeof payloadConfig !== 'string') return missing(id, 'apps/cms/src/payload.config.ts')
  const findings = []
  payloadConfig.split('\n').forEach((line, i) => {
    // Se salta la línea de comentario (conserva la numeración real, a diferencia de stripComments).
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return
    const name = line.match(/\b(PAYLOAD_SECRET|PREVIEW_SECRET|REVALIDATION_SECRET)\s*(\|\||\?\?)\s*(''|""|``)/)
    if (name) {
      findings.push(`apps/cms/src/payload.config.ts:${i + 1} ${name[1]} con fallback vacío`)
    } else if (/^\s*secret\s*:\s*(''|""|``)/.test(line)) {
      findings.push(`apps/cms/src/payload.config.ts:${i + 1} propiedad secret con cadena vacía`)
    }
  })
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// 9. guard-seed-passwords (SEC-08)
// ---------------------------------------------------------------------------

/**
 * Detecta contraseñas por defecto en scripts de seed: una línea con `password` seguida de
 * `?? '<literal>'` o `|| '<literal>'`. Amenaza: credencial pública conocida en instalaciones sembradas.
 * Límite: heurística por línea sobre apps/cms/scripts; no detecta literales armados por partes ni
 * defaults en otros directorios. Los findings son archivo:línea, nunca el literal.
 */
export function guardSeedPasswords(files) {
  const id = 'guard-seed-passwords'
  if (!files || typeof files !== 'object') return missing(id, 'scripts de seed de apps/cms/scripts')
  const findings = []
  for (const [file, content] of Object.entries(files)) {
    ;(content ?? '').split('\n').forEach((line, i) => {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return
      if (/password/i.test(line) && /(\?\?|\|\|)\s*['"`]/.test(line)) {
        findings.push(`${file}:${i + 1} (password con valor por defecto literal)`)
      }
    })
  }
  return result(id, findings)
}

// ---------------------------------------------------------------------------
// Lectura real (solo lectura) y orquestación
// ---------------------------------------------------------------------------

export const GUARD_IDS = [
  'guard-tracked-secrets', 'guard-api-coverage', 'guard-route-roles', 'guard-jsonld',
  'guard-env-parity', 'guard-deploy-steps', 'guard-i18n-parity', 'guard-secret-required',
  'guard-seed-passwords',
]

const LOCALES = ['es', 'en', 'gn', 'pt-BR']

/** Lee un archivo de texto; devuelve null si no existe (el guard lo reporta). */
function readText(root, relative) {
  const full = path.join(root, relative)
  return existsSync(full) ? readFileSync(full, 'utf8') : null
}

/** Recorre un directorio y devuelve rutas relativas (posix) que cumplen `accept`. */
function walk(root, relativeDir, accept) {
  const out = []
  const visit = (rel) => {
    const full = path.join(root, rel)
    if (!existsSync(full)) return
    for (const name of readdirSync(full)) {
      if (name === 'node_modules' || name === '.next') continue
      const childRel = `${rel}/${name}`
      if (statSync(path.join(root, childRel)).isDirectory()) visit(childRel)
      else if (accept(childRel)) out.push(childRel)
    }
  }
  visit(relativeDir)
  return out
}

/** Carga { ruta: contenido } para una lista de rutas relativas. */
function readMap(root, relatives) {
  return Object.fromEntries(relatives.map((rel) => [rel, readText(root, rel) ?? '']))
}

/**
 * Lectura real de insumos para los guards: node:fs de solo lectura y
 * `git ls-files` con spawnSync sin shell (argumentos fijos). No escribe nada.
 * Si git falla, trackedFiles es null y el guard lo reporta como rojo.
 */
export function collectInputs(root = ROOT) {
  const git = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', shell: false })
  const trackedFiles = git.status === 0 ? git.stdout.split('\n').filter(Boolean) : null

  const cmsRoutes = walk(root, 'apps/cms/src/app/api', (f) => f.endsWith('/route.ts'))
  const portalRoutes = walk(root, 'app/api', (f) => f.endsWith('/route.ts'))
  const isSource = (f) => /\.(ts|tsx)$/.test(f)
  const jsonldFiles = [...walk(root, 'app', isSource), ...walk(root, 'components', isSource), ...walk(root, 'lib', isSource)]
  const i18n = {}
  for (const locale of LOCALES) {
    const dir = path.join(root, 'messages', locale)
    i18n[locale] = existsSync(dir) ? readdirSync(dir).sort() : null
  }
  const composePath = 'infrastructure/docker/compose.prod.yaml'
  // DEP-10: código de runtime de cada servicio. Se excluyen pruebas, .d.ts y copias .backup (no se ejecutan).
  const isRuntime = (f) => /\.(ts|tsx|mjs|js)$/.test(f) && !/\.(test|spec|d)\.[a-z]+$|\.backup\./.test(f) && !f.endsWith('/payload-types.ts')
  const portalEnvFiles = [
    ...['app', 'lib', 'components', 'i18n'].flatMap((dir) => walk(root, dir, isRuntime)),
    ...['proxy.ts', 'next.config.mjs', 'sentry.client.config.ts', 'sentry.edge.config.ts', 'sentry.server.config.ts'].filter((f) => existsSync(path.join(root, f))),
  ]
  const cmsEnvFiles = walk(root, 'apps/cms/src', isRuntime)
  const seedFiles = walk(root, 'apps/cms/scripts', (f) => /\.(ts|mjs|js)$/.test(f))

  return {
    trackedFiles,
    proxy: readText(root, 'proxy.ts'),
    apiHandlers: readMap(root, RATE_LIMITED_API_ROUTES),
    routes: readMap(root, cmsRoutes),
    jsonldFiles: readMap(root, jsonldFiles),
    seedFiles: readMap(root, seedFiles),
    env: {
      portalSources: readMap(root, portalEnvFiles),
      cmsSources: readMap(root, cmsEnvFiles),
      compose: readText(root, composePath),
      envExample: readText(root, 'infrastructure/docker/.env.prod.example'),
    },
    deploy: { workflow: readText(root, '.github/workflows/deploy.yml'), compose: readText(root, composePath) },
    i18n,
    i18nFallback: { loader: readText(root, 'lib/i18n/loadMessages.ts'), request: readText(root, 'i18n/request.ts') },
    payloadConfig: readText(root, 'apps/cms/src/payload.config.ts'),
  }
}

/**
 * Ejecuta los 9 guards sobre insumos ya leídos. Devuelve un resultado por
 * guard, siempre en el orden de GUARD_IDS; ninguno se omite aunque otro falle.
 */
export function runGuards(inputs = {}) {
  return [
    guardTrackedSecrets(inputs.trackedFiles),
    guardApiCoverage(inputs.proxy, inputs.apiHandlers),
    guardRouteRoles(inputs.routes),
    guardJsonld(inputs.jsonldFiles),
    guardEnvParity(inputs.env),
    guardDeploySteps(inputs.deploy),
    guardI18nParity(inputs.i18n, inputs.i18nFallback),
    guardSecretRequired(inputs.payloadConfig),
    guardSeedPasswords(inputs.seedFiles),
  ]
}
