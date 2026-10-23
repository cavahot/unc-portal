// DEP-01 — Pruebas del script REAL scripts/setup/restore-db-prod.sh con un shim `docker` sintético.
// Qué hace: ejecuta el script con bash en un directorio temporal, sin Docker, red ni datos reales.
// Por qué: la amenaza es perder datos de producción por un DROP SCHEMA sin respaldo verificado.
// Límite: el shim simula el comportamiento de docker/pg_*; no prueba Postgres real (eso es staging).
// Spec: docs/specs/deploy/DEP-01-restore-seguro-y-dump.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(here, '..', '..', 'scripts', 'setup', 'restore-db-prod.sh');
// En Windows `bash` puede resolver a WSL; se prefiere Git Bash si existe.
// String.raw evita que \b, \P, \G se interpreten como escapes (MEDIO-4, DEP-01).
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');
// Evidencia de qué intérprete corrió las pruebas (Git Bash vs WSL vs bash del PATH).
console.log(`# DEP-01 BASH usado por las pruebas: ${BASH}`);

// Shim: registra cada invocación relevante en $FAKE_LOG y simula docker según variables FAKE_*.
const SHIM = `#!/usr/bin/env bash
args="$*"
echo "ARGS $args" >> "$FAKE_LOG"
case "$args" in
  ps*) echo "other-container"; [ "\${FAKE_NO_CONTAINER:-0}" = 1 ] || echo "unc-postgres-prod"; exit 0;;
  *pg_isready*) echo "EVENT pg_isready" >> "$FAKE_LOG"; exit 0;;
  *information_schema*) echo "EVENT count-tables" >> "$FAKE_LOG"; echo "\${FAKE_TABLES:-0}"; exit 0;;
  *"pg_restore --list"*) cat > /dev/null; echo "EVENT pg_restore-list" >> "$FAKE_LOG"; [ "\${FAKE_LIST_FAIL:-0}" = 1 ] && exit 1; exit 0;;
  *pg_dump*) echo "EVENT pg_dump" >> "$FAKE_LOG"; echo "META umask=$(umask)" >> "$FAKE_LOG"; echo "META backups-mode=$(stat -c %a backups 2>/dev/null)" >> "$FAKE_LOG"; echo "META dump-mode=$(stat -c %a backups/pre-restore-*.dump 2>/dev/null)" >> "$FAKE_LOG"; [ "\${FAKE_DUMP_FAIL:-0}" = 1 ] && exit 1; [ "\${FAKE_DUMP_EMPTY:-0}" = 1 ] && exit 0; printf 'PGDMP-SYNTHETIC'; exit 0;;
  *"DROP SCHEMA"*) echo "EVENT drop" >> "$FAKE_LOG"; [ "\${FAKE_DROP_FAIL:-0}" = 1 ] && { echo "drop failed" >&2; exit 1; }; exit 0;;
  *pg_restore*) cat > /dev/null; echo "EVENT pg_restore" >> "$FAKE_LOG"; exit 0;;
  *"FROM noticias"*) echo 5; exit 0;;
esac
echo "EVENT other:$args" >> "$FAKE_LOG"; exit 0
`;

function run(env = {}, stdin = 'SI\n', { crlf = false, preBackupsMode = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dep01-'));
  mkdirSync(join(dir, 'setup'));
  mkdirSync(join(dir, 'infrastructure', 'docker'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'setup', 'seed.dump.gz'), gzipSync(Buffer.from('PGDMP-FAKE-SEED')));
  const envText = 'POSTGRES_DB=fake_db\nPOSTGRES_USER=fake_user\nPOSTGRES_PASSWORD=not-a-secret\n';
  writeFileSync(join(dir, 'infrastructure', 'docker', '.env.prod'), crlf ? envText.replace(/\n/g, '\r\n') : envText);
  if (preBackupsMode !== null) { mkdirSync(join(dir, 'backups')); chmodSync(join(dir, 'backups'), preBackupsMode); }
  writeFileSync(join(dir, 'bin', 'docker'), SHIM);
  chmodSync(join(dir, 'bin', 'docker'), 0o755);
  const log = join(dir, 'fake.log');
  writeFileSync(log, '');
  const r = spawnSync(BASH, [SCRIPT], {
    cwd: dir,
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, PATH: join(dir, 'bin') + delimiter + process.env.PATH, FAKE_LOG: log, ...env },
  });
  const rawLog = readFileSync(log, 'utf8');
  const lines = rawLog.split('\n').filter(Boolean);
  const events = lines.filter((l) => l.startsWith('EVENT ')).map((l) => l.replace('EVENT ', '').replace(/\r$/, ''));
  const meta = Object.fromEntries(lines.filter((l) => l.startsWith('META ')).map((l) => l.slice(5).split('=')));
  const seedLeft = existsSync(join(dir, 'setup', 'seed.dump'));
  const backups = existsSync(join(dir, 'backups')) ? readdirSync(join(dir, 'backups')) : [];
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  return { r, events, backups, dir, cleanup, rawLog, meta, seedLeft };
}

test('(a) BD con tablas y pg_dump falla: aborta antes del DROP', () => {
  const t = run({ FAKE_TABLES: '3', FAKE_DUMP_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(t.events.includes('pg_dump'));
  assert.ok(!t.events.includes('drop'), 'no debe ejecutar DROP');
  assert.ok(!t.events.includes('pg_restore'));
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

test('(b1) pg_dump devuelve salida vacía: aborta antes del DROP', () => {
  const t = run({ FAKE_TABLES: '3', FAKE_DUMP_EMPTY: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('drop'));
  assert.ok(!t.events.includes('pg_restore'));
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

test('(b2) el dump no se puede listar con pg_restore --list: aborta antes del DROP', () => {
  const t = run({ FAKE_TABLES: '3', FAKE_LIST_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(t.events.includes('pg_restore-list'));
  assert.ok(!t.events.includes('drop'));
  assert.ok(!t.events.includes('pg_restore'));
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

test('(c) el DROP falla: aborta sin ejecutar pg_restore', () => {
  const t = run({ FAKE_TABLES: '3', FAKE_DROP_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(t.events.includes('drop'));
  assert.ok(!t.events.includes('pg_restore'), 'no debe restaurar tras DROP fallido');
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

test('(d) BD vacía: no exige backup y restaura', () => {
  const t = run({ FAKE_TABLES: '0' });
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.ok(!t.events.includes('pg_dump'));
  assert.deepEqual(t.events.filter((e) => ['drop', 'pg_restore'].includes(e)), ['drop', 'pg_restore']);
  assert.equal(t.backups.length, 0);
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

test('(e) backup en backups/pre-restore-<UTC>.dump, ruta informada y orden correcto', () => {
  const t = run({ FAKE_TABLES: '3' });
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.equal(t.backups.length, 1);
  assert.match(t.backups[0], /^pre-restore-\d{8}T\d{6}Z\.dump$/);
  assert.ok(t.r.stdout.includes(`backups/${t.backups[0]}`), 'debe informar la ruta');
  const order = t.events.filter((e) => ['pg_dump', 'pg_restore-list', 'drop', 'pg_restore'].includes(e));
  assert.deepEqual(order, ['pg_dump', 'pg_restore-list', 'drop', 'pg_restore']);
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

test('(f) confirmación distinta de SI cancela sin DROP ni backup', () => {
  const t = run({ FAKE_TABLES: '3' }, 'no\n');
  assert.equal(t.r.status, 0);
  assert.ok(!t.events.includes('drop'));
  assert.ok(!t.events.includes('pg_dump'));
  assert.ok(!t.seedLeft, 'setup/seed.dump no debe quedar tras la salida (MEDIO-2)');
  t.cleanup();
});

// Impide volver a la ruta sin escapar: tras evaluarse debe tener separadores y nombres válidos (MEDIO-4).
test('(h) GIT_BASH es una ruta válida y, si Git Bash está instalado en win32, existe', () => {
  assert.ok(GIT_BASH.includes('Program Files'), GIT_BASH);
  assert.ok(GIT_BASH.endsWith('bash.exe'), GIT_BASH);
  assert.ok(!/[\x00-\x1f]/.test(GIT_BASH), 'sin caracteres de control por escapes corruptos');
  if (process.platform === 'win32' && existsSync(GIT_BASH)) {
    assert.ok(existsSync(GIT_BASH));
    if (!process.env.BASH_BIN) assert.equal(BASH, GIT_BASH);
  }
});

// MEDIO-1: backups con PII sólo para el dueño. umask es heredado y fiable también en NTFS;
// los modos con stat sólo se afirman si chmod se refleja en este FS (NTFS/MSYS suele no reflejarlo).
test('(i) backup con umask 077, backups/ 700 y dump 600 (aunque backups/ preexista con 755)', () => {
  const t = run({ FAKE_TABLES: '3' }, 'SI\n', { preBackupsMode: 0o755 });
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.match(t.meta.umask, /^0?077$/);
  const probe = spawnSync(BASH, ['-c', 'd=$(mktemp -d); chmod 700 "$d"; stat -c %a "$d"; rm -rf "$d"'], { encoding: 'utf8' });
  if (probe.stdout.trim() === '700') {
    assert.equal(t.meta['backups-mode'], '700');
    assert.equal(t.meta['dump-mode'], '600');
  } else {
    console.log('# DEP-01 nota: el FS no refleja chmod; sólo se verificó umask 077');
  }
  t.cleanup();
});

// MEDIO-2: seed.dump descomprimido se borra incluso si el script aborta.
test('(j) en éxito y en abortos no queda setup/seed.dump', () => {
  for (const env of [{ FAKE_TABLES: '0' }, { FAKE_TABLES: '3' }, { FAKE_TABLES: '3', FAKE_DROP_FAIL: '1' }]) {
    const t = run(env);
    assert.ok(!t.seedLeft, JSON.stringify(env));
    t.cleanup();
  }
});

// BAJO: .env.prod con CRLF no debe filtrar CR al usuario/BD pasados a docker.
test('(k) .env.prod en CRLF: el shim recibe usuario y BD sin \r', () => {
  const t = run({ FAKE_TABLES: '0' }, 'SI\n', { crlf: true });
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  const pgIsReady = t.rawLog.split('\n').find((l) => l.includes('pg_isready'));
  assert.ok(pgIsReady.includes('-U fake_user -d fake_db'), pgIsReady);
  // Git Bash (MSYS) ya recorta CR en $(...), así que se exige además la defensa explícita en el script.
  const src = readFileSync(SCRIPT, 'utf8');
  assert.match(src, /POSTGRES_DB=.*tr -d '\\r'/);
  assert.match(src, /POSTGRES_USER=.*tr -d '\\r'/);
  assert.ok(!t.rawLog.includes(String.fromCharCode(13)), 'el log no debe contener CR');
  t.cleanup();
});

// BAJO: contenedor ausente (aunque haya otros) aborta sin tocar la BD.
test('(l) contenedor no listado en docker ps: aborta antes de cualquier acción', () => {
  const t = run({ FAKE_TABLES: '3', FAKE_NO_CONTAINER: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('drop'));
  assert.ok(!t.events.includes('pg_dump'));
  t.cleanup();
});
