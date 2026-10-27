// DEP-09 — Pruebas de COMPORTAMIENTO del gate de readiness y del rollback por sha en el script SSH
// real de deploy.yml, con un shim `docker` (mismo patrón que dep07-deploy-script.test.mjs).
// Qué hace: extrae el `script: |` del paso «Pull images and restart services», lo ejecuta con bash
//   en un directorio temporal y comprueba tag obligatorio, estado `.deploy-previous-tag`, gate con
//   reintentos y vuelta al tag previo.
// Por qué: la amenaza es dejar en producción una versión que no responde (o con la BD caída) sin
//   volver a la anterior, o perder la referencia al último tag sano.
// Límite: el shim simula docker/wget/psql/pg_*; no prueba Compose, busybox `wget`, ni que las imágenes
//   previas sigan en el host. El rollback de imagen NO revierte migraciones. El YAML se lee con
//   extracción textual (sin parser YAML).
// Spec: docs/specs/deploy/DEP-09-health-y-rollback.md (escenarios 10-16)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..');
const WORKFLOW = readFileSync(resolve(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const COMPOSE = readFileSync(resolve(ROOT, 'infrastructure', 'docker', 'compose.prod.yaml'), 'utf8').replace(/\r\n/g, '\n');
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');

/** Extrae el bloque `script: |` del paso con ese nombre (indentación de 12 espacios). */
function extractScript(workflow, stepName) {
  const start = workflow.indexOf(`- name: ${stepName}`);
  assert.ok(start >= 0, `paso «${stepName}» no encontrado`);
  const m = workflow.slice(start).match(/script: \|\n((?: {12}.*\n|\n)+)/);
  assert.ok(m, 'bloque script no encontrado');
  return m[1].split('\n').map((l) => l.replace(/^ {12}/, '')).join('\n');
}

// DEP-19a: el token y el actor ya no se interpolan en el script; llegan por entorno (GHCR_USER/GHCR_TOKEN).
const SCRIPT = extractScript(WORKFLOW, 'Pull images and restart services')
  .replace('cd /opt/unc-portal', 'cd "$WORKDIR"');

/** Quita líneas de comentario YAML/shell: un comentario que menciona algo no es una referencia real. */
const noComments = (text) => text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

const PREV = 'sha-0000000';
const NEW = 'sha-1111111';

// Shim: registra cada llamada. `up -d` fija el «tag en ejecución» (IMAGE_TAG del entorno de la llamada);
// la readiness (`exec <contenedor> wget`) responde según ese tag: FAKE_BAD_TAG = lista (separada por espacios) de tags que nunca están listos,
// FAKE_READY_AFTER = nº de consultas del CMS que fallan antes de responder bien, FAKE_UP_FAIL_TAG = tag cuyo
// `up -d` sale != 0.
const SHIM = `#!/usr/bin/env bash
args="$*"
D="$(dirname "$FAKE_LOG")"
echo "ARGS $args" >> "$FAKE_LOG"
case "$args" in
  "exec unc-cms-prod wget"*|"exec unc-portal-prod wget"*)
    case "$args" in *cms*) who=cms;; *) who=portal;; esac
    cur="$(cat "$D/current_tag" 2>/dev/null)"
    echo "EVENT ready-$who tag=$cur url=\${args##* }" >> "$FAKE_LOG"
    case " \${FAKE_BAD_TAG:-} " in *" $cur "*) exit 1;; esac
    if [ "$who" = cms ] && [ -n "\${FAKE_READY_AFTER:-}" ]; then
      n=$(( $(cat "$D/ready_count" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$D/ready_count"
      [ "$n" -le "$FAKE_READY_AFTER" ] && exit 1
    fi
    exit 0;;
  "rm -f"*) exit 0;;
  "ps -aq"*) exit 0;;
  login*) cat > /dev/null; exit 0;;
  ps*) echo "other"; [ "\${FAKE_PG_RUNNING:-1}" = 1 ] && echo "unc-postgres-prod"; exit 0;;
  "volume inspect"*) exit 1;;
  *information_schema*) echo "\${FAKE_TABLES:-0}"; exit 0;;
  *to_regclass*) echo "t"; exit 0;;
  *"batch = -1"*) echo "0"; exit 0;;
  *"batch > 0"*) echo "1"; exit 0;;
  *"pg_restore --list"*) cat > /dev/null; exit 0;;
  *pg_dump*) printf 'PGDMP-SYNTHETIC'; exit 0;;
  *"run --rm"*cms-migrate*) echo "EVENT migrate" >> "$FAKE_LOG"; [ "\${FAKE_MIGRATE_FAIL:-0}" = 1 ] && exit 1; exit 0;;
  *"up -d"*)
    echo "EVENT up" >> "$FAKE_LOG"
    echo "UPTAG $IMAGE_TAG :: $args" >> "$FAKE_LOG"
    echo "$IMAGE_TAG" > "$D/current_tag"
    [ -n "\${FAKE_UP_FAIL_TAG:-}" ] && [ "$IMAGE_TAG" = "$FAKE_UP_FAIL_TAG" ] && exit 1
    exit 0;;
  *pull*) echo "EVENT pull" >> "$FAKE_LOG"; echo "PULLTAG $IMAGE_TAG" >> "$FAKE_LOG"; exit 0;;
esac
echo "EVENT other:$args" >> "$FAKE_LOG"; exit 0
`;

/**
 * Ejecuta el script real. `prev`: contenido de .deploy-previous-tag (null = el archivo no existe).
 * `imageTag`: valor de IMAGE_TAG (null = variable ausente).
 */
function run({ prev = PREV, imageTag = NEW, env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dep09-'));
  mkdirSync(join(dir, 'infrastructure', 'docker'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'infrastructure', 'docker', '.env.prod'), 'POSTGRES_DB=fake_db\r\nPOSTGRES_USER=fake_user\r\n');
  writeFileSync(join(dir, 'bin', 'docker'), SHIM);
  chmodSync(join(dir, 'bin', 'docker'), 0o755);
  // DEP-19a: shim de flock (el host real lo trae; Git Bash no).
  writeFileSync(join(dir, 'bin', 'flock'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(dir, 'bin', 'flock'), 0o755);
  writeFileSync(join(dir, 'deploy.sh'), SCRIPT);
  const stateFile = join(dir, '.deploy-previous-tag');
  if (prev !== null) writeFileSync(stateFile, `${prev}\n`);
  const log = join(dir, 'fake.log');
  writeFileSync(log, '');
  const childEnv = {
    ...process.env, WORKDIR: dir, PATH: join(dir, 'bin') + delimiter + process.env.PATH, FAKE_LOG: log,
    GHCR_USER: 'fake-actor', GHCR_TOKEN: 'fake-token',
    DEP09_READY_RETRIES: '3', DEP09_READY_INTERVAL: '0', ...env,
  };
  delete childEnv.IMAGE_TAG;
  if (imageTag !== null) childEnv.IMAGE_TAG = imageTag;
  const r = spawnSync(BASH, [join(dir, 'deploy.sh')], { cwd: dir, encoding: 'utf8', env: childEnv, timeout: 60_000 });
  const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/\r$/, ''));
  const events = lines.filter((l) => l.startsWith('EVENT ')).map((l) => l.slice(6));
  const state = existsSync(stateFile) ? readFileSync(stateFile, 'utf8').trim() : null;
  const upTags = lines.filter((l) => l.startsWith('UPTAG ')).map((l) => l.slice(6).split(' ::')[0]);
  const upCalls = lines.filter((l) => l.startsWith('UPTAG ')).map((l) => l.split(' :: ')[1]);
  return { r, lines, events, state, upTags, upCalls, out: `${r.stdout}${r.stderr}`, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const noDown = (t) => assert.ok(!t.lines.some((l) => /^ARGS .*\bdown\b/.test(l)), `se invocó down: ${t.lines.filter((l) => /\bdown\b/.test(l)).join(' | ')}`);

test('el script extraído es sintácticamente válido (bash -n)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dep09syn-'));
  writeFileSync(join(dir, 's.sh'), SCRIPT);
  const r = spawnSync(BASH, ['-n', join(dir, 's.sh')], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
});

// ---- Fail-fast ---------------------------------------------------------------------------------

test('(10) IMAGE_TAG ausente: falla temprano y no invoca docker', () => {
  const t = run({ imageTag: null });
  assert.notEqual(t.r.status, 0);
  assert.equal(t.lines.length, 0, `docker fue invocado: ${t.lines.join(' | ')}`);
  assert.match(t.out, /IMAGE_TAG/);
  assert.equal(t.state, PREV);
  t.cleanup();
});

for (const bad of ['latest', 'sha-abc;rm -rf /', 'sha-XYZ1234', 'sha-12', '']) {
  test(`(10) IMAGE_TAG inválido «${bad}»: falla temprano y no invoca docker`, () => {
    const t = run({ imageTag: bad });
    assert.notEqual(t.r.status, 0);
    assert.equal(t.lines.length, 0, `docker fue invocado: ${t.lines.join(' | ')}`);
    t.cleanup();
  });
}

test('(11) primer deploy sin .deploy-previous-tag: aborta con mensaje claro, sin pull, migrate ni up', () => {
  const t = run({ prev: null });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.some((e) => ['pull', 'migrate', 'up'].includes(e)), t.events.join(','));
  assert.match(t.out, /deploy-previous-tag/);
  assert.match(t.out, /rollback/i);
  assert.equal(t.state, null, 'no debe crear el archivo por su cuenta');
  noDown(t);
  t.cleanup();
});

test('(11) estado corrupto en .deploy-previous-tag: aborta antes de tocar nada', () => {
  const t = run({ prev: 'latest; rm -rf /' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.some((e) => ['pull', 'migrate', 'up'].includes(e)));
  t.cleanup();
});

// ---- Éxito -------------------------------------------------------------------------------------

test('(14) éxito: despliega el tag nuevo, pasa el gate y SOLO entonces actualiza el tag previo', () => {
  const t = run();
  assert.equal(t.r.status, 0, t.out);
  assert.deepEqual(t.upTags, [NEW]);
  assert.equal(t.state, NEW);
  assert.ok(t.events.some((e) => e.startsWith('ready-cms tag=' + NEW)));
  assert.ok(t.events.some((e) => e.startsWith('ready-portal tag=' + NEW)));
  assert.ok(t.lines.includes('PULLTAG ' + NEW), 'el pull debe usar el tag nuevo');
  // El gate usa la red interna (docker exec contra el contenedor), no la URL pública.
  const gateLines = t.lines.filter((l) => l.startsWith('ARGS exec unc-cms-prod wget') || l.startsWith('ARGS exec unc-portal-prod wget'));
  assert.ok(gateLines.length >= 2);
  assert.ok(gateLines.every((l) => /127.0.0.1:3000/.test(l) && !/unc\.edu\.py/.test(l)), gateLines.join('\n'));
  assert.ok(gateLines.some((l) => /\/api\/health\/ready/.test(l)), 'el CMS se comprueba por readiness');
  noDown(t);
  t.cleanup();
});

test('(14) éxito tras reintentos: la readiness responde a la 3.ª consulta y el deploy es sano', () => {
  const t = run({ env: { FAKE_READY_AFTER: '2', DEP09_READY_RETRIES: '5' } });
  assert.equal(t.r.status, 0, t.out);
  assert.equal(t.state, NEW);
  assert.equal(t.events.filter((e) => e.startsWith('ready-cms')).length, 3);
  t.cleanup();
});

// ---- Fallo y rollback --------------------------------------------------------------------------

test('(12) readiness que nunca responde: reintenta N veces, vuelve al tag previo, exit != 0 y NO sobrescribe el estado', () => {
  const t = run({ env: { FAKE_BAD_TAG: NEW } });
  assert.notEqual(t.r.status, 0);
  assert.deepEqual(t.upTags, [NEW, PREV], 'primero el nuevo y luego el rollback al previo');
  assert.equal(t.state, PREV, 'el tag previo no se sobrescribe');
  assert.equal(t.events.filter((e) => e.startsWith('ready-cms tag=' + NEW)).length, 3, 'tantos intentos como DEP09_READY_RETRIES');
  assert.match(t.out, /rollback/i);
  assert.match(t.out, new RegExp(PREV));
  // Declara el límite: el rollback de imagen no revierte migraciones; restauración manual.
  assert.match(t.out, /migraci/i);
  assert.match(t.out, /backups\/pre-deploy/);
  noDown(t);
  t.cleanup();
});

test('(12) el rollback no relanza migraciones ni toca dependencias: up -d --no-deps cms portal', () => {
  const t = run({ env: { FAKE_BAD_TAG: NEW } });
  const rollbackCall = t.upCalls[1];
  assert.match(rollbackCall, /up -d --no-deps cms portal/);
  assert.equal(t.events.filter((e) => e === 'migrate').length, 1, 'migrate solo corre una vez (antes del up)');
  t.cleanup();
});

test('(13) el rollback también falla: exit != 0, estado intacto y mensaje de intervención manual', () => {
  const t = run({ env: { FAKE_BAD_TAG: `${NEW}`, FAKE_UP_FAIL_TAG: PREV } });
  assert.notEqual(t.r.status, 0);
  assert.equal(t.state, PREV);
  assert.match(t.out, /manual/i);
  noDown(t);
  t.cleanup();
});

test('(13) ni el tag previo queda sano tras el rollback: se informa que NO se recuperó y exit != 0', () => {
  const t = run({ env: { FAKE_BAD_TAG: `${NEW} ${PREV}` } });
  assert.notEqual(t.r.status, 0);
  assert.deepEqual(t.upTags, [NEW, PREV]);
  assert.equal(t.state, PREV);
  assert.match(t.out, /no se recuper/i);
  t.cleanup();
});

test('(15) up -d falla con el tag nuevo: se trata como fallo del gate (rollback), no como éxito', () => {
  const t = run({ env: { FAKE_UP_FAIL_TAG: NEW } });
  assert.notEqual(t.r.status, 0);
  assert.deepEqual(t.upTags, [NEW, PREV]);
  assert.equal(t.state, PREV);
  t.cleanup();
});

test('migrate falla: aborta ANTES de up (la versión anterior sigue sirviendo, sin rollback) y el estado no cambia', () => {
  const t = run({ env: { FAKE_MIGRATE_FAIL: '1' } });
  assert.notEqual(t.r.status, 0);
  assert.deepEqual(t.upTags, []);
  assert.equal(t.state, PREV);
  t.cleanup();
});

// ---- Comprobaciones estáticas ------------------------------------------------------------------

test('(16) compose: cms, cms-migrate y portal usan ${IMAGE_TAG:?…}; sin :latest salvo MinIO (DEP-11)', () => {
  const imageLines = COMPOSE.split('\n').filter((l) => /^\s*image:/.test(l));
  const own = imageLines.filter((l) => /ghcr\.io\/cavahot\//.test(l));
  assert.equal(own.length, 3, own.join('\n'));
  for (const l of own) assert.match(l, /\$\{IMAGE_TAG:\?[^}]+\}/, l);
  const latest = COMPOSE.split('\n').filter((l) => /:latest\b/.test(l) && !/^\s*#/.test(l));
  assert.equal(latest.length, 1, latest.join('\n'));
  assert.match(latest[0], /minio/);
  assert.doesNotMatch(noComments(COMPOSE), /CMS_IMAGE_TAG/);
});

test('(16) compose: el healthcheck del cms apunta a /api/health/ready; el del portal a /api/health', () => {
  const cms = COMPOSE.slice(COMPOSE.indexOf('\n  cms:'), COMPOSE.indexOf('\n  cms-migrate:'));
  assert.match(cms, /127.0.0.1:3000\/api\/health\/ready/);
  const portal = COMPOSE.slice(COMPOSE.indexOf('\n  portal:'), COMPOSE.indexOf('\n  nginx:'));
  assert.match(portal, /127.0.0.1:3000\/api\/health\s/);
});

test('(16) deploy.yml: el tag sale de workflow_run.head_sha, se pasa al servidor por envs y latest es solo alias', () => {
  assert.match(WORKFLOW, /workflow_run\.head_sha/);
  assert.match(WORKFLOW, /envs:\s*IMAGE_TAG/);
  assert.match(WORKFLOW, /IMAGE_TAG:\s*\$\{\{\s*needs\.[^}]*\}\}|IMAGE_TAG:\s*\$\{\{\s*steps\.[^}]*\}\}/);
  assert.match(WORKFLOW, /type=raw,value=latest/);
  // El build etiqueta con el mismo tag que despliega el job (no con GITHUB_SHA de workflow_run).
  assert.doesNotMatch(noComments(WORKFLOW), /type=sha/);
  assert.doesNotMatch(WORKFLOW, /migrate:(down|reset|refresh|fresh)/);
  assert.ok(!/docker compose[^\n]*\bdown\b/.test(WORKFLOW));
});

test('(16) el script usa readiness interna y declara DEP09_READY_RETRIES / DEP09_READY_INTERVAL configurables', () => {
  assert.match(SCRIPT, /DEP09_READY_RETRIES:-12/);
  assert.match(SCRIPT, /DEP09_READY_INTERVAL:-5/);
  assert.match(SCRIPT, /api\/health\/ready/);
});
