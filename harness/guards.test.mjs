import test from 'node:test'
import assert from 'node:assert/strict'
import {
  guardTrackedSecrets, guardMinioSecrets, guardApiCoverage, guardRouteRoles, guardJsonld,
  guardEnvParity, guardMediaVolume, guardBackupEncrypted, ENV_IGNORED, parseComposeEnvironments, guardDeploySteps, guardI18nParity, guardSecretRequired, guardSeedPasswords,
  GUARD_IDS, runGuards, RATE_LIMITED_API_ROUTES, PUBLIC_API_ROUTES, collectInputs,
} from './guards.mjs'
import { getPlan } from './check.mjs'

// DEP-00: cada guard tiene fixture mala (debe fallar) y buena (debe pasar). Sin secretos reales.

test('guard-tracked-secrets: detecta dumps, backups, .env y restos versionados', () => {
  const bad = guardTrackedSecrets([
    'setup/seed.dump.gz', 'a/b.bak', 'x.backup.sql', '.env.prod', 'apps/cms/.env',
    'test_write.txt', 'package.json.before-fix.json', 'package.cms.before-x.json', 'apps/cms/test.env', 'README.md',
    // DEP-17: lock respaldado, errores de migración en la raíz y artefactos de Playwright.
    'package-lock.before-cms-repair.json', 'package.before-cms-repair.json', 'migration-errors.json', 'test-results/.last-run.json', 'apps/cms/test-results/a.json',
  ])
  assert.equal(bad.id, 'guard-tracked-secrets')
  assert.equal(bad.passed, false)
  assert.equal(bad.findings.length, 14)
  assert.ok(bad.findings.some((f) => f.includes('setup/seed.dump.gz')))
  const good = guardTrackedSecrets(['README.md', '.env.example', 'infrastructure/docker/.env.prod.example', 'package.json', 'package-lock.json', 'scripts/migrate-wordpress.mjs', 'docs/migration-errors.md'])
  assert.equal(good.passed, true)
  assert.deepEqual(good.findings, [])
  assert.equal(guardTrackedSecrets(null).passed, false)
})

test('guard-api-coverage: matcher que excluye api/ con lógica /api/ es rojo', () => {
  const handlers = Object.fromEntries(RATE_LIMITED_API_ROUTES.map((f) => [f,
    `import { createRateLimiter } from '@/lib/security/rateLimit'
const l = createRateLimiter({ limit: 1, windowMs: 1 })
export async function POST(){ l.check('x') }`]))
  const bad = `if (pathname.startsWith('/api/')) { limit() }
export const config = { matcher: ['/((?!_next/static|api/|images/).*)'] }`
  const good = `// /api/ no se trata aquí: ver lib/security
export const config = { matcher: ['/((?!_next/static|api/|images/).*)'] }`
  assert.equal(guardApiCoverage(bad, handlers).passed, false)
  assert.equal(guardApiCoverage(good, handlers).passed, true)
  assert.equal(guardApiCoverage(null, handlers).passed, false)
})

test('guard-api-coverage (DEP-06): cada handler público debe importar y llamar al limitador', () => {
  const proxy = "export const config = { matcher: ['/((?!_next/static|api/).*)'] }"
  const ok = `import { createRateLimiter } from '@/lib/security/rateLimit'
const l = createRateLimiter({})
l.check(ip)`
  const all = Object.fromEntries(RATE_LIMITED_API_ROUTES.map((f) => [f, ok]))
  assert.equal(guardApiCoverage(proxy, all).passed, true)
  // Sin limitador en un handler: rojo y nombra el archivo.
  const sinLimite = { ...all, [RATE_LIMITED_API_ROUTES[0]]: 'export async function POST(){}' }
  const r1 = guardApiCoverage(proxy, sinLimite)
  assert.equal(r1.passed, false)
  assert.ok(r1.findings.some((f) => f.includes(RATE_LIMITED_API_ROUTES[0])))
  // Un comentario que menciona el limitador no cuenta como control.
  const soloComentario = { ...all, [RATE_LIMITED_API_ROUTES[1]]: `// import rateLimit from 'security/rateLimit'; rl.check(x)
export async function GET(){}` }
  assert.equal(guardApiCoverage(proxy, soloComentario).passed, false)
  // Importa pero nunca llama a check: rojo.
  const sinCheck = { ...all, [RATE_LIMITED_API_ROUTES[2]]: `import { createRateLimiter } from '@/lib/security/rateLimit'` }
  assert.equal(guardApiCoverage(proxy, sinCheck).passed, false)
  // Handler ausente o lista ausente: rojo.
  const { [RATE_LIMITED_API_ROUTES[3]]: _omit, ...faltante } = all
  assert.equal(guardApiCoverage(proxy, faltante).passed, false)
  assert.equal(guardApiCoverage(proxy, undefined).passed, false)
})

test('guard-route-roles: toda ruta CMS exige rol o está en lista blanca', () => {
  const routes = {
    'apps/cms/src/app/api/logs/route.ts': 'export async function GET(){ return Response.json({}) }',
    'apps/cms/src/app/api/alerts/route.ts': 'if (!hasRole(user, ["superadmin"])) return forbidden()',
    'apps/cms/src/app/api/comentado/route.ts': '// hasRole(user, [])\nexport const GET = () => 1',
    'apps/cms/src/app/api/pub/route.ts': 'export const GET = () => 1',
  }
  const bad = guardRouteRoles(routes, ['apps/cms/src/app/api/pub/route.ts'])
  assert.equal(bad.passed, false)
  assert.deepEqual(bad.findings.map((f) => f.split(' ')[0]).sort(), [
    'apps/cms/src/app/api/comentado/route.ts', 'apps/cms/src/app/api/logs/route.ts',
  ])
  const good = guardRouteRoles({
    'a/route.ts': 'if (user.role === "admin") {}',
    'b/route.ts': 'await requireRole(req, ["auditor"])',
    'c/route.ts': 'x',
  }, ['c/route.ts'])
  assert.equal(good.passed, true)
  assert.equal(guardRouteRoles({}, []).passed, false)
})

test('guard-jsonld: JSON.stringify directo en dangerouslySetInnerHTML es rojo', () => {
  const bad = guardJsonld({
    'app/x.tsx': '<script dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />',
    'app/y.tsx': '<script\n dangerouslySetInnerHTML={{\n __html: JSON.stringify(s) }} />',
  })
  assert.equal(bad.passed, false)
  assert.equal(bad.findings.length, 2)
  assert.ok(bad.findings[0].startsWith('app/x.tsx:1'))
  const good = guardJsonld({
    'app/x.tsx': '<script dangerouslySetInnerHTML={{ __html: safeJsonLd(s) }} />',
    'lib/doc.ts': ' *   dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />',
  })
  assert.equal(good.passed, true)
})

// DEP-10: la paridad se evalúa POR SERVICIO (variable leída por el servicio X debe estar en el
// environment de X, resolviendo el ancla `x-cms-env`), no por nombre global. Fixtures buena/mala por regla.
const ENV_COMPOSE = [
  'x-cms-env: &cms-env',
  '    NODE_ENV: production',
  '    CMS_ONLY: ${CMS_ONLY}',
  '    NEXT_PUBLIC_SERVER_URL: ${CMS_PUBLIC_URL}',
  '    S3_ENDPOINT: http://minio:9000',
  '',
  'services:',
  '  postgres:',
  '    environment:',
  '      POSTGRES_DB: ${POSTGRES_DB}',
  '  cms:',
  '    image: ghcr.io/x/cms:${IMAGE_TAG:?obligatorio}',
  '    environment: *cms-env',
  '  cms-migrate:',
  '    environment: *cms-env',
  '  portal:',
  '    environment:',
  '      NODE_ENV: production',
  '      SHARED: ${SHARED}',
  '      # comentario ${NO_ES_VARIABLE}',
  '      LIMIT: ${LIMIT:-5}',
  '',
].join('\n')
const ENV_EXAMPLE = ['POSTGRES_DB=x', 'CMS_ONLY=REEMPLAZAR_A', 'CMS_PUBLIC_URL=https://cms.example.org', 'SHARED=REEMPLAZAR_B', 'LIMIT=5', ''].join('\n')
const envInput = (over = {}) => ({
  portalSources: { 'app/a.ts': 'process.env.SHARED; process.env.LIMIT; process.env.NODE_ENV' },
  cmsSources: { 'apps/cms/src/a.ts': 'process.env.CMS_ONLY; process.env.NEXT_PUBLIC_SERVER_URL; process.env.S3_ENDPOINT' },
  compose: ENV_COMPOSE, envExample: ENV_EXAMPLE, ...over,
})

test('guard-env-parity: fixture buena (ancla, ${X:-d}, literal y proyección de nombres) pasa', () => {
  const good = guardEnvParity(envInput())
  assert.deepEqual(good.findings, [])
  assert.equal(good.passed, true)
})

test('guard-env-parity: variable leída por un servicio que NO la recibe es rojo aunque otro servicio la tenga', () => {
  const bad = guardEnvParity(envInput({ portalSources: { 'app/a.ts': 'process.env.SHARED; process.env.LIMIT; process.env.CMS_ONLY' } }))
  assert.equal(bad.passed, false)
  assert.ok(bad.findings.some((f) => f.includes('CMS_ONLY') && f.includes('portal') && f.includes('app/a.ts')), bad.findings.join('|'))
  const bad2 = guardEnvParity(envInput({ cmsSources: { 'apps/cms/src/a.ts': 'process.env.CMS_ONLY; process.env.NEXT_PUBLIC_SERVER_URL; process.env.S3_ENDPOINT; process.env.SHARED' } }))
  assert.ok(bad2.findings.some((f) => f.includes('SHARED') && f.includes('cms')))
})

test('guard-env-parity: clave del environment que ningún código del servicio lee es rojo', () => {
  const bad = guardEnvParity(envInput({ cmsSources: { 'apps/cms/src/a.ts': 'process.env.CMS_ONLY; process.env.S3_ENDPOINT' } }))
  assert.equal(bad.passed, false)
  assert.ok(bad.findings.some((f) => f.includes('NEXT_PUBLIC_SERVER_URL') && f.includes('cms') && f.includes('ningún código')))
})

test('guard-env-parity: ${VAR} del compose ausente del ejemplo es rojo; IMAGE_TAG lo inyecta el pipeline', () => {
  const bad = guardEnvParity(envInput({ envExample: ENV_EXAMPLE.replace('SHARED=REEMPLAZAR_B\n', '') }))
  assert.equal(bad.passed, false)
  assert.ok(bad.findings.some((f) => f.includes('SHARED') && f.includes('.env.prod.example')))
  assert.ok(!bad.findings.some((f) => f.includes('IMAGE_TAG') || f.includes('NO_ES_VARIABLE')))
})

test('guard-env-parity: variable huérfana del ejemplo (sin compose ni código) es rojo', () => {
  const bad = guardEnvParity(envInput({ envExample: ENV_EXAMPLE + 'HUERFANA=1\n' }))
  assert.equal(bad.passed, false)
  assert.ok(bad.findings.some((f) => f.includes('HUERFANA') && f.includes('huérfana')))
})

test('guard-env-parity: build-time (SENTRY_ORG) no se exige al compose pero sí debe leerla código si está en el ejemplo', () => {
  const withBuild = envInput({
    portalSources: { 'app/a.ts': 'process.env.SHARED; process.env.LIMIT', 'next.config.mjs': 'process.env.SENTRY_ORG' },
    envExample: ENV_EXAMPLE + 'SENTRY_ORG=unc\n',
  })
  assert.equal(guardEnvParity(withBuild).passed, true)
  const orphanBuild = envInput({ envExample: ENV_EXAMPLE + 'SENTRY_ORG=unc\n' })
  assert.equal(guardEnvParity(orphanBuild).passed, false)
})

test('guard-env-parity: reconoce la lectura por alias `env = process.env` (getDatabaseURL) y no otros `env.X`', () => {
  const alias = { 'apps/cms/src/a.ts': 'process.env.CMS_ONLY; process.env.NEXT_PUBLIC_SERVER_URL; process.env.S3_ENDPOINT',
    'apps/cms/src/config/database.ts': 'export function f(env = process.env) { return env.ALIAS_VAR }' }
  const bad = guardEnvParity(envInput({ cmsSources: alias }))
  assert.ok(bad.findings.some((f) => f.includes('ALIAS_VAR') && f.includes('cms')), bad.findings.join('|'))
  const noAlias = { ...alias, 'apps/cms/src/config/database.ts': 'const x = { env: 1 }; x.env.OTHER_VAR' }
  assert.ok(!guardEnvParity(envInput({ cmsSources: noAlias })).findings.some((f) => f.includes('OTHER_VAR')))
})

test('guard-env-parity: ENV_IGNORED documenta la razón de cada entrada y no oculta variables reales', () => {
  assert.ok(Array.isArray(ENV_IGNORED) && ENV_IGNORED.length > 0)
  for (const entry of ENV_IGNORED) {
    assert.equal(typeof entry.name, 'string', 'entrada sin nombre exacto')
    assert.ok(typeof entry.reason === 'string' && entry.reason.length >= 20, `${entry.name}: razón ausente`)
  }
  const names = ENV_IGNORED.map((e) => e.name)
  for (const real of ['SMTP_USER', 'SMTP_PASSWORD', 'SMTP_PASS', 'CONTACT_TO', 'PORTAL_URL', 'POSTGRES_SSL', 'MINIO_ENDPOINT', 'PREVIEW_SECRET', 'REVALIDATION_SECRET', 'NEXT_PUBLIC_SENTRY_DSN']) {
    assert.ok(!names.includes(real), `${real} no puede ocultarse en ENV_IGNORED`)
  }
})

test('guard-env-parity: entradas ausentes fallan con finding explícito', () => {
  assert.equal(guardEnvParity({ ...envInput(), compose: null }).passed, false)
  assert.equal(guardEnvParity({ ...envInput(), envExample: null }).passed, false)
  assert.equal(guardEnvParity({}).passed, false)
})

test('guard-env-parity: compose con servicio portal o cms ausente es rojo', () => {
  const bad = guardEnvParity(envInput({ compose: ['services:', '  cms:', '    environment:', '      A: 1', ''].join('\n') }))
  assert.equal(bad.passed, false)
  assert.ok(bad.findings.some((f) => f.includes('portal')))
})

test('parseComposeEnvironments: resuelve ancla, bloque literal y descarta comentarios', () => {
  const r = parseComposeEnvironments(ENV_COMPOSE)
  assert.deepEqual([...r.services.cms].sort(), ['CMS_ONLY', 'NEXT_PUBLIC_SERVER_URL', 'NODE_ENV', 'S3_ENDPOINT'])
  assert.deepEqual([...r.services['cms-migrate']].sort(), [...r.services.cms].sort())
  assert.deepEqual([...r.services.portal].sort(), ['LIMIT', 'NODE_ENV', 'SHARED'])
  assert.ok(r.interpolated.has('IMAGE_TAG') && r.interpolated.has('CMS_PUBLIC_URL') && r.interpolated.has('LIMIT'))
  assert.ok(!r.interpolated.has('NO_ES_VARIABLE'))
})

test('guard-env-parity: sobre el repo real pasa sin ocultar nada (DEP-10)', () => {
  const r = guardEnvParity(collectInputs().env)
  assert.deepEqual(r.findings, [])
})

test('guard-deploy-steps: exige migración, backup, rollback y sin :latest', () => {
  const bad = guardDeploySteps({ workflow: 'steps:\n - run: docker compose up -d', compose: 'image: ghcr.io/x/app:latest' })
  assert.equal(bad.passed, false)
  assert.equal(bad.findings.length, 4)
  const good = guardDeploySteps({
    workflow: 'run: pg_dump > b.sql\nrun: payload migrate\nrun: ./rollback.sh',
    compose: 'image: ghcr.io/x/app:${IMAGE_TAG}\nimage: minio:RELEASE.2025',
  })
  assert.equal(good.passed, true)
  assert.equal(guardDeploySteps({ workflow: null, compose: null }).passed, false)
})

// DEP-09: el valor por defecto `:-latest` de una variable también es una referencia a `latest`.
test('guard-deploy-steps: detecta el default :-latest de una variable de imagen', () => {
  const r = guardDeploySteps({
    workflow: 'pg_dump migrate rollback',
    compose: '    image: ghcr.io/x/app:${TAG:-latest}\n    image: ghcr.io/x/b:${IMAGE_TAG:?obligatorio}\n    # image: x:latest',
  })
  assert.deepEqual(r.findings, ['compose.prod.yaml:1 usa :latest'])
})

// DEP-09: readiness pública declarada en la lista blanca (con su razón en guards.mjs) y repo real.
test('guard-route-roles: /api/health/ready está en PUBLIC_API_ROUTES y el repo real queda en verde', () => {
  assert.ok(PUBLIC_API_ROUTES.includes('apps/cms/src/app/api/health/ready/route.ts'))
  assert.ok(PUBLIC_API_ROUTES.includes('apps/cms/src/app/api/health/route.ts'))
  const inputs = collectInputs()
  assert.ok(inputs.routes['apps/cms/src/app/api/health/ready/route.ts'] !== undefined, 'la ruta de readiness debe existir')
  assert.equal(guardRouteRoles(inputs.routes).passed, true)
})

// DEP-09: contra el repo real, deploy.yml ya tiene rollback y el compose ya no usa :latest propio,
// pero el :latest de MinIO (DEP-11) NO se oculta.
test('guard-deploy-steps sobre el repo real: sin «falta rollback» ni :latest propios; MinIO sigue visible', () => {
  const r = guardDeploySteps(collectInputs().deploy)
  assert.ok(!r.findings.some((f) => /rollback/.test(f)), r.findings.join(' | '))
  assert.equal(r.findings.length, 1, r.findings.join(' | '))
  assert.match(r.findings[0], /usa :latest/)
  const compose = collectInputs().deploy.compose.split('\n')
  const line = Number(r.findings[0].match(/:(\d+) usa/)[1])
  assert.match(compose[line - 1], /minio/)
})

test('guard-i18n-parity: faltante sin fallback declarado es rojo; directorio ausente también', () => {
  const bad = guardI18nParity({ es: ['a.json', 'b.json'], en: ['a.json'], gn: ['a.json', 'b.json'], 'pt-BR': ['a.json', 'b.json'] })
  assert.equal(bad.passed, false)
  assert.deepEqual(bad.findings, ['en: falta b.json'])
  assert.equal(guardI18nParity({ es: ['a.json'], en: ['a.json'], gn: ['a.json'], 'pt-BR': ['a.json'] }).passed, true)
  assert.equal(guardI18nParity({ es: ['a.json'], en: null, gn: ['a.json'], 'pt-BR': ['a.json'] }).passed, false)
})

// DEP-15: con fallback por archivo a `es` comprobado en el código, el faltante es deuda informativa.
const LOADER_OK = ["export const I18N_FALLBACK_LOCALE = 'es'", 'export async function loadMessages() {}'].join('\n')
const REQUEST_OK = ["import { loadMessages } from '@/lib/i18n/loadMessages'", 'const m = await loadMessages(locale, ns)'].join('\n')
const PARTIAL = { es: ['a.json', 'b.json'], en: ['a.json'], gn: ['a.json', 'b.json'], 'pt-BR': ['a.json', 'b.json'] }

test('guard-i18n-parity: faltante con fallback comprobado pasa y queda como deuda informativa', () => {
  const r = guardI18nParity(PARTIAL, { loader: LOADER_OK, request: REQUEST_OK })
  assert.equal(r.passed, true)
  assert.deepEqual(r.findings, [])
  assert.deepEqual(r.informational, ['en: falta b.json (fallback a es)'])
})

test('guard-i18n-parity: fallback no comprobable en el código no se acepta', () => {
  // request.ts no invoca loadMessages: la deuda sigue siendo roja.
  assert.equal(guardI18nParity(PARTIAL, { loader: LOADER_OK, request: 'export default {}' }).passed, false)
  // el cargador no declara es como locale de fallback.
  assert.equal(guardI18nParity(PARTIAL, { loader: 'export async function loadMessages() {}', request: REQUEST_OK }).passed, false)
  // la declaración solo en un comentario no cuenta.
  assert.equal(guardI18nParity(PARTIAL, { loader: "// I18N_FALLBACK_LOCALE = 'es'", request: REQUEST_OK }).passed, false)
  // fuentes ausentes.
  assert.equal(guardI18nParity(PARTIAL, { loader: null, request: null }).passed, false)
})

test('guard-i18n-parity: directorio de locale ausente es rojo aunque haya fallback', () => {
  const r = guardI18nParity({ ...PARTIAL, en: null }, { loader: LOADER_OK, request: REQUEST_OK })
  assert.equal(r.passed, false)
  assert.ok(r.findings.some((f) => f.includes('en: directorio ausente')))
})

test('guard-secret-required: PAYLOAD_SECRET con fallback vacío es rojo', () => {
  const bad = guardSecretRequired("a\n  secret: process.env.PAYLOAD_SECRET || '',")
  assert.equal(bad.passed, false)
  assert.ok(bad.findings[0].includes(':2'))
  const good = guardSecretRequired('secret: requireEnv("PAYLOAD_SECRET"),')
  assert.equal(good.passed, true)
  assert.equal(guardSecretRequired(null).passed, false)
})

// DEP-16: el patrón nuevo (validador) pasa; fallbacks vacíos de PREVIEW/REVALIDATION y `secret: ''` literal son rojos.
test('guard-secret-required: reconoce resolvePayloadSecret y rechaza otros fallbacks vacíos', () => {
  assert.equal(guardSecretRequired('  secret: resolvePayloadSecret(),\n  const s = process.env.PREVIEW_SECRET').passed, true)
  for (const bad of [
    "const s = process.env.PREVIEW_SECRET || ''",
    'const s = process.env.REVALIDATION_SECRET ?? ""',
    "  secret: '',",
    '  secret: ``,',
  ]) {
    const r = guardSecretRequired(bad)
    assert.equal(r.passed, false, bad)
    assert.ok(r.findings.every((f) => !f.includes('=')), 'el hallazgo no debe copiar valores')
  }
})

// SEC-08: fixture mala (default literal con ?? y ||) y buena (helper obligatorio) del guard de seeds.
test('guard-seed-passwords: password con ?? o || y literal es rojo; el helper es verde', () => {
  const bad = guardSeedPasswords({
    'apps/cms/scripts/seed/a.ts': "password: process.env.X ?? 'literal-de-prueba',",
    'apps/cms/scripts/seed/b.ts': 'const password = process.env.X || "otro-literal"',
  })
  assert.equal(bad.passed, false)
  assert.equal(bad.findings.length, 2)
  assert.ok(!bad.findings.join(' ').includes('literal-de-prueba'), 'no debe imprimir el literal')
  const good = guardSeedPasswords({
    'apps/cms/scripts/seed/a.ts': 'password: seedAdminPassword,',
    'apps/cms/scripts/seed/b.ts': "// password ?? 'comentario'\nconst url = process.env.URL ?? 'http://x'",
  })
  assert.equal(good.passed, true)
  assert.equal(guardSeedPasswords(null).passed, false)
  // SEC-08: script de la raíz con `process.env.CMS_PASSWORD || 'literal'` marcado; limpio y fallback vacío no.
  const root = guardSeedPasswords({
    'scripts/x.mjs': "const CMS_PASSWORD = process.env.CMS_PASSWORD || 'literal-de-prueba'",
  })
  assert.equal(root.passed, false)
  assert.ok(root.findings[0].startsWith('scripts/x.mjs:1'))
  assert.equal(guardSeedPasswords({
    'scripts/y.mjs': 'const CMS_PASSWORD = requireCmsPassword()',
    'scripts/z.mjs': "const CMS_PASSWORD = process.env.CMS_PASSWORD || ''",
  }).passed, true)
})

// MIG-IMG fase 1: el servicio cms debe tener un volumen nombrado persistente en MEDIA_DIR y la imagen debe
// crear ese directorio con dueño nextjs (uid 1001); si no, los archivos subidos se pierden en cada redeploy
// o la primera subida falla por permisos (hipótesis H-PERM de MIG-IMG).
const MEDIA_COMPOSE_OK = [
  'x-cms-env: &cms-env',
  '    MEDIA_DIR: /app/media',
  'services:',
  '  cms:',
  '    environment: *cms-env',
  '    volumes:',
  '      - cms_media:/app/media',
  '  nginx:',
  '    image: nginx',
  'volumes:',
  '  cms_media:',
  '    name: unc_cms_media_prod',
].join('\n')
const MEDIA_DOCKERFILE_OK = 'FROM x AS runner\nENV MEDIA_DIR=/app/media\nRUN mkdir -p /app/media && chown nextjs:nodejs /app/media\n'

test('guard-media-volume: sin volumen, sin chown o con montaje en otra ruta es rojo', () => {
  assert.equal(guardMediaVolume({ compose: MEDIA_COMPOSE_OK, dockerfile: MEDIA_DOCKERFILE_OK }).passed, true)
  const noVolume = MEDIA_COMPOSE_OK.replace('    volumes:\n      - cms_media:/app/media\n', '')
  assert.equal(guardMediaVolume({ compose: noVolume, dockerfile: MEDIA_DOCKERFILE_OK }).passed, false)
  const otherPath = MEDIA_COMPOSE_OK.replace('cms_media:/app/media', 'cms_media:/otra/ruta')
  assert.equal(guardMediaVolume({ compose: otherPath, dockerfile: MEDIA_DOCKERFILE_OK }).passed, false)
  const bind = MEDIA_COMPOSE_OK.replace('cms_media:/app/media', './media:/app/media')
  assert.equal(guardMediaVolume({ compose: bind, dockerfile: MEDIA_DOCKERFILE_OK }).passed, false)
  const undeclared = MEDIA_COMPOSE_OK.replace('  cms_media:\n    name: unc_cms_media_prod', '  otro:\n    name: x')
  assert.equal(guardMediaVolume({ compose: undeclared, dockerfile: MEDIA_DOCKERFILE_OK }).passed, false)
  assert.equal(guardMediaVolume({ compose: MEDIA_COMPOSE_OK, dockerfile: 'FROM x\n' }).passed, false)
  assert.equal(guardMediaVolume({ compose: MEDIA_COMPOSE_OK.replace('    MEDIA_DIR: /app/media\n', ''), dockerfile: MEDIA_DOCKERFILE_OK }).passed, false)
  assert.equal(guardMediaVolume({ compose: null, dockerfile: null }).passed, false)
})

test('guard-media-volume sobre el repo real pasa', () => {
  const r = guardMediaVolume(collectInputs().media)
  assert.deepEqual(r.findings, [])
})

// BKP-01: el workflow de copia diaria no puede subir un .dump en claro a un artefacto (repo público).
const BKP_SCRIPT_OK = 'gpg --batch --symmetric --cipher-algo AES256 --passphrase-fd 0 -o "$out" "$in"\nMIN=20\n'
const BKP_WF_OK = [
  'permissions:', '  contents: read', 'jobs:', '  database:', '    steps:',
  '      - run: bash scripts/backup/encrypt-dump.sh --check',
  '        env:', '          BACKUP_ENCRYPTION_PASSPHRASE: ${{ secrets.BACKUP_ENCRYPTION_PASSPHRASE }}',
  '      - run: pg_dump "$DATABASE_URL" --file="$DUMP_FILE"',
  '      - run: bash scripts/backup/encrypt-dump.sh "$DUMP_FILE"',
  '        env:', '          BACKUP_ENCRYPTION_PASSPHRASE: ${{ secrets.BACKUP_ENCRYPTION_PASSPHRASE }}',
  '      - uses: actions/upload-artifact@v4',
  '        with:', '          name: db-backup', '          path: |', '            ${{ env.ENCRYPTED_FILE }}', '            ${{ env.ENCRYPTED_FILE }}.sha256',
  '      - if: always()', '        run: rm -f ./*.dump',
].join('\n')

test('guard-backup-encrypted: artefacto en claro, sin secreto, frase en argv o sin limpieza son rojos', () => {
  assert.equal(guardBackupEncrypted({ workflow: BKP_WF_OK, script: BKP_SCRIPT_OK }).passed, true)
  const plain = BKP_WF_OK.replace('${{ env.ENCRYPTED_FILE }}\n', '${{ env.DUMP_FILE }}\n')
  assert.equal(guardBackupEncrypted({ workflow: plain, script: BKP_SCRIPT_OK }).passed, false)
  const noSecret = BKP_WF_OK.replaceAll('secrets.BACKUP_ENCRYPTION_PASSPHRASE', 'secrets.OTRO')
  assert.equal(guardBackupEncrypted({ workflow: noSecret, script: BKP_SCRIPT_OK }).passed, false)
  const noClean = BKP_WF_OK.replace('if: always()', 'if: success()')
  assert.equal(guardBackupEncrypted({ workflow: noClean, script: BKP_SCRIPT_OK }).passed, false)
  const argv = 'gpg --batch --symmetric --passphrase "$P" -o x y\n'
  assert.equal(guardBackupEncrypted({ workflow: BKP_WF_OK, script: argv }).passed, false)
  assert.equal(guardBackupEncrypted({ workflow: BKP_WF_OK, script: 'cp a b\n' }).passed, false)
  assert.equal(guardBackupEncrypted({ workflow: BKP_WF_OK.replace('encrypt-dump.sh --check', 'true'), script: BKP_SCRIPT_OK }).passed, false)
  assert.equal(guardBackupEncrypted({ workflow: null, script: null }).passed, false)
})

test('guard-backup-encrypted sobre el repo real pasa', () => {
  const r = guardBackupEncrypted(collectInputs().backup)
  assert.deepEqual(r.findings, [])
})

test('el plan expone los 12 guards y runGuards devuelve un resultado por guard', () => {
  assert.equal(GUARD_IDS.length, 12)
  const ids = getPlan('quick').filter((s) => s.guard).map((s) => s.id)
  assert.deepEqual(ids, GUARD_IDS)
  const results = runGuards({})
  assert.deepEqual(results.map((r) => r.id), GUARD_IDS)
  assert.ok(results.every((r) => r.passed === false), 'entradas ausentes no deben lanzar ni pasar')
})

// SEC-MINIO-01: guard de claves de MinIO/S3 literales en scripts y docs versionados (fixtures sintéticas).
test('guard-minio-secrets: detecta literales largos y no revela el valor', () => {
  const fake = 'a'.repeat(32) // valor sintético, no es una credencial real
  const bad = guardMinioSecrets({
    'scripts/a.sh': `MINIO_SECRET_KEY="${fake}"`,
    'scripts/b.ps1': `$SecretKey = "${fake}"`,
    'docs/c.md': `AWS_SECRET_ACCESS_KEY='${fake}'`,
  })
  assert.equal(bad.id, 'guard-minio-secrets')
  assert.equal(bad.passed, false)
  assert.equal(bad.findings.length, 3)
  assert.ok(bad.findings.every((f) => !f.includes(fake)), 'los findings no contienen el valor')
  const good = guardMinioSecrets({
    'scripts/a.sh': 'MINIO_SECRET_KEY="${MINIO_SECRET_KEY:?falta}"',
    'scripts/b.ps1': '$SecretKey = $env:MINIO_SECRET_KEY',
    'docs/c.md': 'Secret Key: <MINIO_SECRET_KEY>',
  })
  assert.equal(good.passed, true)
  assert.equal(guardMinioSecrets(null).passed, false)
})

test('guard-minio-secrets sobre el repo real pasa', () => {
  const r = guardMinioSecrets(collectInputs().minioFiles)
  assert.deepEqual(r.findings, [])
})
