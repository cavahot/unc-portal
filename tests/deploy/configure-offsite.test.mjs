// BACKUP-MEDIA-01 (D2) — Asistente scripts/backup/configure-offsite.sh: pregunta, prueba y solo entonces escribe.
// Qué hace: ejecuta el asistente (interactivo por stdin y --non-interactive) con ssh/rclone simulados y un
//   archivo de entorno temporal; comprueba que no escribe si la conexión falla, que no imprime secretos y que
//   `--check` informa el estado de .offsite-status.
// Por qué: una configuración con una prueba fallida dejaría al dueño creyendo que tiene copia externa. Amenaza:
//   falsa sensación de seguridad y fuga de la llave/passphrase por pantalla. Límite: no toca servidores reales.
// Spec: docs/specs/backup/BACKUP-MEDIA-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeEnv, PASS } from './_backup-helpers.mjs';

const envFile = (t) => join(t.dir, 'backup.env');
const read = (t) => (existsSync(envFile(t)) ? readFileSync(envFile(t), 'utf8') : '');

test('(1) responder «no» explica las opciones, sale 0, deja recordatorio y NO escribe configuración', () => {
  const t = makeEnv();
  const r = t.run('configure-offsite.sh', ['--env-file', envFile(t)], {}, 'no\n');
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /segundo servidor/i);
  assert.match(r.out, /rclone/i);
  assert.equal(read(t), '');
  assert.match(readFileSync(join(t.local, '.offsite-status'), 'utf8'), /state=not_configured/);
  t.cleanup();
});

test('(2) interactivo ssh: pregunta host/usuario/puerto/ruta/llave, prueba con BatchMode y escribe BACKUP_REMOTE/KEY', () => {
  const t = makeEnv();
  const input = ['si', 'ssh', 'respaldo.example.org', 'bkp', '2222', '/srv/unc', '/root/.ssh/id_bkp', ''].join('\n');
  const r = t.run('configure-offsite.sh', ['--env-file', envFile(t)], {}, input);
  assert.equal(r.status, 0, r.out);
  const sshLine = t.logText().split('\n').find((l) => l.startsWith('ssh '));
  assert.ok(sshLine, 'no probó la conexión');
  assert.match(sshLine, /BatchMode=yes/);
  assert.match(sshLine, /-p 2222/);
  assert.match(sshLine, /bkp@respaldo\.example\.org/);
  const env = read(t);
  assert.match(env, /^BACKUP_REMOTE=ssh:\/\/bkp@respaldo\.example\.org:2222\/srv\/unc$/m);
  assert.match(env, /^BACKUP_SSH_KEY=\/root\/\.ssh\/id_bkp$/m);
  t.cleanup();
});

test('(3) la prueba falla: NO escribe nada y sale != 0', () => {
  const t = makeEnv();
  const r = t.run('configure-offsite.sh', ['--non-interactive', '--type', 'ssh', '--host', 'h.example', '--user', 'u', '--path', '/srv/x', '--env-file', envFile(t)], { FAKE_SSH_FAIL: '1' });
  assert.notEqual(r.status, 0);
  assert.equal(read(t), '');
  assert.match(r.out, /no se (guard|escrib)/i);
  t.cleanup();
});

test('(4) --non-interactive ssh correcto: escribe, conserva otras variables y deja el archivo en 600', () => {
  const t = makeEnv();
  writeFileSync(envFile(t), 'BACKUP_ENCRYPTION_PASSPHRASE=' + PASS + '\nBACKUP_REMOTE=viejo@x:/y\nOTRA=1\n');
  const r = t.run('configure-offsite.sh', ['--non-interactive', '--type', 'ssh', '--host', 'h.example', '--user', 'u', '--path', '/srv/x', '--env-file', envFile(t)]);
  assert.equal(r.status, 0, r.out);
  const env = read(t);
  assert.equal((env.match(/^BACKUP_REMOTE=/gm) || []).length, 1);
  assert.match(env, /^BACKUP_REMOTE=ssh:\/\/u@h\.example\/srv\/x$/m);
  assert.match(env, /^OTRA=1$/m);
  assert.match(env, new RegExp(`^BACKUP_ENCRYPTION_PASSPHRASE=${PASS}$`, 'm'));
  assert.ok(!r.out.includes(PASS), 'el asistente imprimió el secreto');
  t.cleanup();
});

test('(5) rclone: prueba con `rclone lsd` y escribe el remoto; si falla no escribe', () => {
  const t = makeEnv();
  const ok = t.run('configure-offsite.sh', ['--non-interactive', '--type', 'rclone', '--remote', 'miS3:unc-backups', '--env-file', envFile(t)]);
  assert.equal(ok.status, 0, ok.out);
  assert.match(t.logText(), /^rclone lsd miS3:/m);
  assert.match(read(t), /^BACKUP_REMOTE=miS3:unc-backups$/m);
  const t2 = makeEnv();
  const bad = t2.run('configure-offsite.sh', ['--non-interactive', '--type', 'rclone', '--remote', 'miS3:unc-backups', '--env-file', envFile(t2)], { FAKE_RCLONE_FAIL: '1' });
  assert.notEqual(bad.status, 0);
  assert.equal(read(t2), '');
  t.cleanup(); t2.cleanup();
});

test('(6) valores peligrosos (metacaracteres, espacios, ruta relativa de llave) se rechazan sin probar ni escribir', () => {
  const t = makeEnv();
  for (const host of ['h;rm -rf /', 'h x', '$(id)']) {
    const r = t.run('configure-offsite.sh', ['--non-interactive', '--type', 'ssh', '--host', host, '--user', 'u', '--path', '/srv/x', '--env-file', envFile(t)]);
    assert.notEqual(r.status, 0, host);
  }
  assert.ok(!/^ssh /m.test(t.logText()));
  assert.equal(read(t), '');
  t.cleanup();
});

test('(7) --check informa el estado sin secretos; sin archivo dice not_configured', () => {
  const t = makeEnv();
  const none = t.run('configure-offsite.sh', ['--check']);
  assert.equal(none.status, 0, none.out);
  assert.match(none.out, /not_configured/);
  mkdirSync(t.local, { recursive: true });
  writeFileSync(join(t.local, '.offsite-status'), 'state=ok\ntimestamp=2026-10-27T02:00:00Z\n');
  const r = t.run('configure-offsite.sh', ['--check'], { BACKUP_REMOTE: 'u@h:/srv', BACKUP_SSH_KEY: '/k/secreta', BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /state=ok/);
  assert.match(r.out, /2026-10-27T02:00:00Z/);
  assert.ok(!r.out.includes(PASS));
  assert.ok(!r.out.includes('/k/secreta'));
  t.cleanup();
});

test('(8) el asistente no usa set -x y no recibe secretos por argv', () => {
  const code = readFileSync(join(process.cwd(), 'scripts', 'backup', 'configure-offsite.sh'), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.doesNotMatch(code, /set -x|xtrace/);
  assert.doesNotMatch(code, /--passphrase/);
});
