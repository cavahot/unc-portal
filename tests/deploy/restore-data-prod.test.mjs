// DEP-07 (vía C) — Pruebas del script REAL scripts/setup/restore-data-prod.sh con un shim `docker`.
// Qué hace: ejecuta el script con bash en un directorio temporal, sin Docker, red ni datos reales.
// Por qué: la amenaza es cargar un dump sobre un esquema no migrado o sobre tablas con datos, o
//   arrastrar payload_migrations/sesiones del origen.
// Límite: el shim simula docker/psql/pg_*; NO prueba que el dump real sea compatible con el baseline
//   (hipótesis DEP-07 que exige Postgres sintético autorizado).
// Spec: docs/specs/deploy/DEP-07-via-unica-de-esquema.md (C-1 … C-5)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, chmodSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..');
const SCRIPT = resolve(ROOT, 'scripts', 'setup', 'restore-data-prod.sh');
const EXCLUDE = resolve(ROOT, 'setup', 'restore-data.exclude.txt');
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');

// TOC sintético con el formato de `pg_restore --list`.
const TOC = [
  ';', '; Archive created at 2026-08-08', '215; 1259 16390 TABLE public users cesar',
  '3412; 0 16390 TABLE DATA public users cesar',
  '3413; 0 16400 TABLE DATA public noticias cesar',
  '3414; 0 16410 TABLE DATA public users_sessions cesar',
  '3415; 0 16411 TABLE DATA public payload_migrations cesar',
  '3416; 0 16412 TABLE DATA public payload_kv cesar',
  '3417; 0 16413 TABLE DATA public payload_locked_documents cesar',
  '3418; 0 16414 TABLE DATA public payload_preferences cesar',
  '3419; 0 0 SEQUENCE SET public noticias_id_seq cesar',
  '3420; 0 0 SEQUENCE SET public payload_migrations_id_seq cesar',
  '3421; 0 0 SEQUENCE SET public payload_kv_id_seq cesar',
].join('\n');

const SHIM = `#!/usr/bin/env bash
args="$*"
echo "ARGS $args" >> "$FAKE_LOG"
case "$args" in
  ps*) echo "other"; [ "\${FAKE_NO_CONTAINER:-0}" = 1 ] || echo "unc-postgres-prod"; exit 0;;
  *pg_isready*) exit 0;;
  *to_regclass*) echo "EVENT check-migrations-table" >> "$FAKE_LOG"; echo "\${FAKE_MIGRATED:-t}"; exit 0;;
  *"name = "*) echo "\${FAKE_BASELINE:-1}"; exit 0;;
  *"batch = -1"*) echo "\${FAKE_DEV:-0}"; exit 0;;
  *"SELECT EXISTS"*)
    for t in \${FAKE_NONEMPTY:-}; do case "$args" in *"\\"$t\\""*) echo "t"; exit 0;; esac; done
    for t in \${FAKE_MISSING:-}; do case "$args" in *"\\"$t\\""*) echo 'relation does not exist' >&2; exit 1;; esac; done
    echo "f"; exit 0;;
  *"pg_restore --list"*) cat > /dev/null; echo "EVENT pg_restore-list" >> "$FAKE_LOG"; printf '%s\\n' "$FAKE_TOC"; exit 0;;
  cp*) echo "EVENT cp" >> "$FAKE_LOG"; cp "$2" "$FAKE_DIR/list.copy"; exit 0;;
  *"-f -"*) cat > /dev/null; echo "EVENT sequences" >> "$FAKE_LOG"; exit 0;;
  *pg_dump*) echo "EVENT pg_dump" >> "$FAKE_LOG"; printf 'PGDMP-SYNTHETIC'; exit 0;;
  *pg_restore*) cat > /dev/null; echo "EVENT pg_restore" >> "$FAKE_LOG"; echo "META restore=$args" >> "$FAKE_LOG"; [ "\${FAKE_RESTORE_FAIL:-0}" = 1 ] && exit 1; exit 0;;
  *"FROM noticias"*) echo 5; exit 0;;
esac
echo "EVENT other:$args" >> "$FAKE_LOG"; exit 0
`;

function run(env = {}, stdin = 'SI\n') {
  const dir = mkdtempSync(join(tmpdir(), 'dep07r-'));
  mkdirSync(join(dir, 'setup'));
  mkdirSync(join(dir, 'infrastructure', 'docker'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'setup', 'seed.dump.gz'), gzipSync(Buffer.from('PGDMP-FAKE-SEED')));
  copyFileSync(EXCLUDE, join(dir, 'setup', 'restore-data.exclude.txt'));
  writeFileSync(join(dir, 'infrastructure', 'docker', '.env.prod'), 'POSTGRES_DB=fake_db\r\nPOSTGRES_USER=fake_user\r\n');
  writeFileSync(join(dir, 'bin', 'docker'), SHIM);
  chmodSync(join(dir, 'bin', 'docker'), 0o755);
  const log = join(dir, 'fake.log');
  writeFileSync(log, '');
  const r = spawnSync(BASH, [SCRIPT], {
    cwd: dir, input: stdin, encoding: 'utf8',
    env: { ...process.env, PATH: join(dir, 'bin') + delimiter + process.env.PATH, FAKE_LOG: log, FAKE_DIR: dir, FAKE_TOC: TOC, ...env },
  });
  const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/\r$/, ''));
  const events = lines.filter((l) => l.startsWith('EVENT ')).map((l) => l.slice(6));
  const restoreArgs = (lines.find((l) => l.startsWith('META restore=')) ?? '').slice(13);
  const listCopy = existsSync(join(dir, 'list.copy')) ? readFileSync(join(dir, 'list.copy'), 'utf8') : null;
  return {
    r, events, lines, restoreArgs, listCopy,
    seedLeft: existsSync(join(dir, 'setup', 'seed.dump')),
    backups: existsSync(join(dir, 'backups')) ? readdirSync(join(dir, 'backups')) : [],
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test('(1) esquema no migrado (sin payload_migrations): aborta sin backup ni restore', () => {
  const t = run({ FAKE_MIGRATED: 'f' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('pg_dump') && !t.events.includes('pg_restore'));
  t.cleanup();
});

test('(1b) baseline no registrado: aborta', () => {
  const t = run({ FAKE_BASELINE: '0' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('pg_restore'));
  t.cleanup();
});

test('(1c) fila batch = -1 (dev) presente: aborta', () => {
  const t = run({ FAKE_DEV: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('pg_restore'));
  t.cleanup();
});

test('(2) tablas de datos con filas: aborta sin tocar nada', () => {
  const t = run({ FAKE_NONEMPTY: 'noticias' });
  assert.notEqual(t.r.status, 0);
  assert.match(t.r.stdout, /noticias/);
  assert.ok(!t.events.includes('pg_dump') && !t.events.includes('pg_restore'));
  assert.ok(!t.seedLeft);
  t.cleanup();
});

test('(2b) tabla del dump ausente en el esquema (deriva): aborta en voz alta', () => {
  const t = run({ FAKE_MISSING: 'noticias' });
  assert.notEqual(t.r.status, 0);
  assert.match(t.r.stdout, /deriva|no existe/);
  assert.ok(!t.events.includes('pg_restore'));
  t.cleanup();
});

test('(3) éxito: backup verificado, pg_restore --data-only --single-transaction con -L y exclusiones', () => {
  const t = run();
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  const order = t.events.filter((e) => ['pg_dump', 'pg_restore-list', 'cp', 'pg_restore', 'sequences'].includes(e));
  // pg_restore-list aparece primero para el TOC del seed y de nuevo para verificar el backup.
  assert.deepEqual(order, ['pg_restore-list', 'pg_dump', 'pg_restore-list', 'cp', 'pg_restore', 'sequences']);
  assert.match(t.restoreArgs, /--data-only/);
  assert.match(t.restoreArgs, /--single-transaction/);
  assert.match(t.restoreArgs, /-L \/tmp\/restore-data\.list/);
  assert.equal(t.backups.length, 1);
  assert.match(t.backups[0], /^pre-restore-data-\d{8}T\d{6}Z\.dump$/);
  assert.match(t.listCopy, /TABLE DATA public users /);
  assert.match(t.listCopy, /TABLE DATA public noticias /);
  assert.match(t.listCopy, /SEQUENCE SET public noticias_id_seq/);
  for (const ex of ['payload_migrations', 'users_sessions', 'payload_kv', 'payload_locked_documents', 'payload_preferences']) {
    assert.doesNotMatch(t.listCopy, new RegExp(`public ${ex}( |$)`, 'm'), ex);
  }
  assert.doesNotMatch(t.listCopy, /TABLE public users/, 'solo entradas de datos');
  assert.ok(!t.seedLeft, 'no queda setup/seed.dump');
  t.cleanup();
});

test('(4) pg_restore falla: exit != 0, mensaje de rollback y sin seed residual', () => {
  const t = run({ FAKE_RESTORE_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(t.events.includes('pg_restore'));
  assert.ok(!t.events.includes('sequences'));
  assert.match(t.r.stdout, /revirtió/);
  assert.ok(!t.seedLeft);
  t.cleanup();
});

test('(5) confirmación distinta de SI cancela sin backup ni restore, y limpia el seed', () => {
  const t = run({}, 'no\n');
  assert.equal(t.r.status, 0);
  assert.ok(!t.events.includes('pg_dump') && !t.events.includes('pg_restore'));
  assert.ok(!t.seedLeft);
  t.cleanup();
});

test('(6) contenedor ausente: aborta; .env.prod con CRLF no filtra CR', () => {
  const a = run({ FAKE_NO_CONTAINER: '1' });
  assert.notEqual(a.r.status, 0);
  a.cleanup();
  const b = run();
  assert.ok(b.lines.some((l) => l.includes('-U fake_user -d fake_db')));
  assert.ok(!b.lines.join('\n').includes('\r'));
  b.cleanup();
});

test('(7) la lista de exclusión excluye payload_migrations y el BASELINE_NAME coincide con index.ts', () => {
  assert.match(readFileSync(EXCLUDE, 'utf8'), /^payload_migrations$/m);
  const name = readFileSync(resolve(ROOT, 'apps/cms/src/migrations/index.ts'), 'utf8').match(/name:\s*'([^']+)'/)[1];
  assert.ok(readFileSync(SCRIPT, 'utf8').includes(`BASELINE_NAME="${name}"`));
});
