// DEP-07 — Pruebas de COMPORTAMIENTO del script SSH real de deploy.yml con un shim `docker`.
// Qué hace: extrae el `script: |` del paso «Pull images and restart services», lo ejecuta con bash
//   en un directorio temporal y verifica el orden pull → pg_dump verificado → migrate → up y los abortos.
// Por qué: la amenaza es migrar sin respaldo, o levantar la versión nueva con el esquema a medias.
// Límite: el shim simula docker/psql/pg_*; no prueba Postgres ni Compose reales (eso exige entorno
//   sintético autorizado). El YAML se parsea con una extracción textual, no con un parser YAML.
// Spec: docs/specs/deploy/DEP-07-via-unica-de-esquema.md (C1, C2, C3, C5)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const WORKFLOW = readFileSync(resolve(here, '..', '..', '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');

/** Extrae el bloque `script: |` del paso con ese nombre (indentación de 12 espacios). */
export function extractScript(workflow, stepName) {
  const start = workflow.indexOf(`- name: ${stepName}`);
  assert.ok(start >= 0, `paso «${stepName}» no encontrado`);
  const rest = workflow.slice(start);
  const m = rest.match(/script: \|\n((?: {12}.*\n|\n)+)/);
  assert.ok(m, 'bloque script no encontrado');
  return m[1].split('\n').map((l) => l.replace(/^ {12}/, '')).join('\n');
}

// DEP-19a: el token y el actor ya no se interpolan en el script; llegan por entorno (GHCR_USER/GHCR_TOKEN).
const SCRIPT = extractScript(WORKFLOW, 'Pull images and restart services')
  .replace('cd /opt/unc-portal', 'cd "$WORKDIR"');

const SHIM = `#!/usr/bin/env bash
args="$*"
echo "ARGS $args" >> "$FAKE_LOG"
case "$args" in
  "rm -f"*) n="\${args#rm -f }"; [ -f "$FAKE_STATE" ] && { grep -vxF "$n" "$FAKE_STATE" > "$FAKE_STATE.tmp"; mv "$FAKE_STATE.tmp" "$FAKE_STATE"; }; exit 0;;
  "ps -aq"*) [ -f "$FAKE_STATE" ] && cat "$FAKE_STATE"; exit 0;;
  login*) cat > /dev/null; echo "EVENT login" >> "$FAKE_LOG"; exit 0;;
  ps*) echo "other"; [ "\${FAKE_PG_RUNNING:-1}" = 1 ] && echo "unc-postgres-prod"; exit 0;;
  "volume inspect"*) echo "EVENT volume-inspect" >> "$FAKE_LOG"; [ "\${FAKE_VOLUME:-0}" = 1 ] && exit 0; exit 1;;
  *information_schema*) echo "\${FAKE_TABLES:-0}"; exit 0;;
  *to_regclass*) echo "\${FAKE_HAS_MIG:-t}"; exit 0;;
  *"batch = -1"*) echo "\${FAKE_DEV:-0}"; exit 0;;
  *"batch > 0"*) echo "\${FAKE_APPLIED:-1}"; exit 0;;
  *"pg_restore --list"*) cat > /dev/null; echo "EVENT pg_restore-list" >> "$FAKE_LOG"; [ "\${FAKE_LIST_FAIL:-0}" = 1 ] && exit 1; exit 0;;
  *pg_dump*) echo "EVENT pg_dump" >> "$FAKE_LOG"; [ "\${FAKE_DUMP_FAIL:-0}" = 1 ] && exit 1; [ "\${FAKE_DUMP_EMPTY:-0}" = 1 ] && exit 0; printf 'PGDMP-SYNTHETIC'; exit 0;;
  *"run --rm"*cms-migrate*) echo "EVENT migrate" >> "$FAKE_LOG"; case "$args" in *"--name "*) cn="\${args#*--name }"; cn="\${cn%% *}";; *) cn="proj-cms-migrate-run-a1b2c3d4";; esac; echo "$cn" >> "$FAKE_STATE"; echo "STATE created=$cn" >> "$FAKE_LOG"; [ "\${FAKE_MIGRATE_FAIL:-0}" = 1 ] || [ "\${FAKE_MIGRATE_HANG:-0}" = 1 ] || { grep -vxF "$cn" "$FAKE_STATE" > "$FAKE_STATE.tmp"; mv "$FAKE_STATE.tmp" "$FAKE_STATE"; }; echo "META migrate-flags=$args" >> "$FAKE_LOG"; [ "\${FAKE_MIGRATE_FAIL:-0}" = 1 ] && exit 1; [ "\${FAKE_MIGRATE_HANG:-0}" = 1 ] && exec sleep 20; exit 0;;
  "exec unc-cms-prod wget"*"/api/aranceles-rectorado"*) printf '{"docs":[],"totalDocs":0}'; exit 0;;
  *"up -d"*) echo "EVENT up" >> "$FAKE_LOG"; exit 0;;
  *pull*) echo "EVENT pull" >> "$FAKE_LOG"; exit 0;;
esac
echo "EVENT other:$args" >> "$FAKE_LOG"; exit 0
`;

function run(env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dep07d-'));
  mkdirSync(join(dir, 'infrastructure', 'docker'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'infrastructure', 'docker', '.env.prod'), 'POSTGRES_DB=fake_db\r\nPOSTGRES_USER=fake_user\r\n');
  writeFileSync(join(dir, 'bin', 'docker'), SHIM);
  // DEP-09: el script exige IMAGE_TAG y el estado `.deploy-previous-tag`; se siembran para estas pruebas de DEP-07.
  writeFileSync(join(dir, '.deploy-previous-tag'), 'sha-0000000\n');
  chmodSync(join(dir, 'bin', 'docker'), 0o755);
  // DEP-19a: el script toma un flock en el host (Git Bash no lo trae): shim que concede el lock.
  writeFileSync(join(dir, 'bin', 'flock'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(dir, 'bin', 'flock'), 0o755);
  writeFileSync(join(dir, 'deploy.sh'), SCRIPT);
  const log = join(dir, 'fake.log');
  writeFileSync(log, '');
  // Estado del shim: nombres de contenedores de compose vivos (un `compose run` colgado NO se limpia solo).
  const state = join(dir, 'fake.state');
  writeFileSync(state, env.FAKE_STATE_SEED ? `${env.FAKE_STATE_SEED}\n` : '');
  const r = spawnSync(BASH, [join(dir, 'deploy.sh')], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, WORKDIR: dir, IMAGE_TAG: 'sha-1111111', GHCR_USER: 'fake-actor', GHCR_TOKEN: 'fake-token', PATH: join(dir, 'bin') + delimiter + process.env.PATH, FAKE_LOG: log, FAKE_STATE: state, ...env },
  });
  const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/\r$/, ''));
  const events = lines.filter((l) => l.startsWith('EVENT ')).map((l) => l.slice(6));
  const backups = existsSync(join(dir, 'backups')) ? readdirSync(join(dir, 'backups')) : [];
  const alive = readFileSync(state, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
  return { r, events, backups, lines, alive, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const core = (events) => events.filter((e) => ['pull', 'pg_dump', 'pg_restore-list', 'migrate', 'up'].includes(e));

test('el script extraído es sintácticamente válido (bash -n)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dep07syn-'));
  writeFileSync(join(dir, 's.sh'), SCRIPT);
  const r = spawnSync(BASH, ['-n', join(dir, 's.sh')], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
});

test('(C1) BD con tablas: pull → pg_dump → pg_restore --list → migrate → up', () => {
  const t = run({ FAKE_TABLES: '64' });
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.deepEqual(core(t.events), ['pull', 'pg_dump', 'pg_restore-list', 'migrate', 'up']);
  assert.equal(t.backups.length, 1);
  assert.match(t.backups[0], /^pre-deploy-\d{8}T\d{6}Z\.dump$/);
  t.cleanup();
});

test('(C1) primer deploy (sin contenedor ni volumen): sin pg_dump pero sí migrate → up', () => {
  const t = run({ FAKE_PG_RUNNING: '0', FAKE_VOLUME: '0' });
  // Sin contenedor, la comprobación posterior a migrate usa `docker exec` del shim (responde 1): válido.
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.deepEqual(core(t.events), ['pull', 'migrate', 'up']);
  t.cleanup();
});

test('(C1) Postgres con 0 tablas: se omite el backup sin error', () => {
  const t = run({ FAKE_TABLES: '0' });
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.deepEqual(core(t.events), ['pull', 'migrate', 'up']);
  t.cleanup();
});

test('(C2) pg_dump falla: aborta sin migrate ni up', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_DUMP_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  assert.equal(t.backups.length, 0, 'no deja un dump parcial');
  t.cleanup();
});

test('(C2) backup vacío: aborta sin migrate ni up', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_DUMP_EMPTY: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  t.cleanup();
});

test('(C2) backup ilegible (pg_restore --list falla): aborta sin migrate ni up', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_LIST_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  t.cleanup();
});

test('(C2) volumen existente pero Postgres detenido: aborta (no se continúa a ciegas)', () => {
  const t = run({ FAKE_PG_RUNNING: '0', FAKE_VOLUME: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  t.cleanup();
});

test('(C3) migrate falla: exit != 0 y NO se ejecuta up', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_MIGRATE_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(t.events.includes('migrate'));
  assert.ok(!t.events.includes('up'));
  t.cleanup();
});

// DEP-07/D4: `payload migrate` con una fila batch = -1 y stdin cerrado queda COLGADO esperando el prompt
// (medido en docs/evidence/dep-07-validation.md, ítem 4; no sale con 0). Amenaza: el job SSH se bloquea hasta
// el timeout de la acción. Límite: el shim simula el cuelgue con `sleep`; el prompt real no se reproduce aquí.
test('(D4) migrate colgado: el timeout lo corta, exit != 0, NO se ejecuta up y el mensaje lo dice', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_MIGRATE_HANG: '1', DEP07_MIGRATE_TIMEOUT: '2' });
  assert.notEqual(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.ok(t.events.includes('migrate'));
  assert.ok(!t.events.includes('up'), 'no debe levantar la versión nueva');
  assert.match(t.r.stdout + t.r.stderr, /timeout/i);
  assert.match(t.r.stdout + t.r.stderr, /cms-migrate/);
  t.cleanup();
});

// DEP-07/D7: `docker compose run` IGNORA `container_name`; sin `--name` el migrador colgado queda vivo como
// `<proyecto>-cms-migrate-run-<hash>` y `docker rm -f unc-cms-migrate-prod` no lo toca (exit 0 silencioso).
// Evidencia: docs/evidence/dep-07-revalidation.md. Límite: el shim modela este comportamiento, no Docker real.
test('(D7) tras el timeout no queda ningún contenedor cms-migrate vivo', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_MIGRATE_HANG: '1', DEP07_MIGRATE_TIMEOUT: '2' });
  assert.notEqual(t.r.status, 0);
  assert.deepEqual(t.alive.filter((n) => /cms-migrate/.test(n)), [], `huérfanos: ${t.alive.join(', ')}`);
  t.cleanup();
});

test('(D7) el run lleva --name unc-cms-migrate-prod', () => {
  const t = run({ FAKE_TABLES: '64' });
  const flags = t.lines.find((l) => l.startsWith('META migrate-flags='));
  assert.match(flags, /run --rm -T --name unc-cms-migrate-prod cms-migrate/);
  t.cleanup();
});

test('(D7) defensa por etiqueta: limpia aunque el nombre no coincida (huérfano con nombre de compose)', () => {
  // Contenedor previo de un run SIN --name (p. ej. deploy anterior): solo la limpieza por label lo elimina.
  const t = run({ FAKE_TABLES: '64', FAKE_MIGRATE_HANG: '1', DEP07_MIGRATE_TIMEOUT: '2', FAKE_STATE_SEED: 'proj-cms-migrate-run-old999' });
  assert.deepEqual(t.alive.filter((n) => /cms-migrate/.test(n)), []);
  t.cleanup();
});

test('(D4) el timeout es configurable y su valor por defecto es razonable (600 s)', () => {
  assert.match(SCRIPT, /DEP07_MIGRATE_TIMEOUT:-600/);
});

test('(C5) fila batch = -1 en payload_migrations: aborta ANTES de migrate', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_DEV: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  t.cleanup();
});

test('anti falso verde: migrate sale 0 pero no hay migraciones aplicadas → aborta antes de up', () => {
  const t = run({ FAKE_TABLES: '64', FAKE_APPLIED: '0' });
  assert.notEqual(t.r.status, 0);
  assert.ok(t.events.includes('migrate'));
  assert.ok(!t.events.includes('up'));
  t.cleanup();
});

test('migrate corre sin TTY (-T) y con stdin desconectado; el workflow nunca invoca down/reset/refresh/fresh', () => {
  const t = run({ FAKE_TABLES: '64' });
  const flags = t.lines.find((l) => l.startsWith('META migrate-flags='));
  assert.match(flags, /run --rm -T (--name \S+ )?cms-migrate/);
  assert.doesNotMatch(WORKFLOW, /migrate:(down|reset|refresh|fresh)/);
  t.cleanup();
});
