// BACKUP-MEDIA-01 (C, D1) — Gancho de copia externa: solo sube cifrado, no es fatal y deja estado.
// Qué hace: ejecuta scripts/backup/offsite-push.sh con rsync/rclone/ssh simulados.
// Por qué: la copia externa es la única defensa si el VPS se pierde; pero subir un archivo en claro o romper
//   el respaldo local por un fallo de red sería peor que no tenerla. Límite: no hay red ni servidor real.
// Spec: docs/specs/backup/BACKUP-MEDIA-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { makeEnv, PASS } from './_backup-helpers.mjs';

function setup() {
  const t = makeEnv();
  mkdirSync(t.local, { recursive: true });
  const gpg = join(t.local, 'media-20261027T020000Z.tar.gz.gpg');
  writeFileSync(gpg, 'CIFRADO');
  return { t, gpg, status: () => readFileSync(join(t.local, '.offsite-status'), 'utf8') };
}

test('(1) sin BACKUP_REMOTE: aviso en español, state=not_configured, exit 0, nada se sube', () => {
  const { t, gpg, status } = setup();
  const r = t.run('offsite-push.sh', [gpg]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /COPIA EXTERNA NO CONFIGURADA: los respaldos solo existen en este servidor\. Ejecute scripts\/backup\/configure-offsite\.sh/);
  assert.match(status(), /state=not_configured/);
  assert.match(status(), /timestamp=\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ/);
  assert.ok(!/^(rsync|rclone|ssh) /m.test(t.logText()));
  t.cleanup();
});

test('(2) rechaza subir un archivo que no es .gpg (exit != 0) y no invoca ningún transporte', () => {
  const { t } = setup();
  const plain = join(t.local, 'db-20261027T020000Z.dump');
  writeFileSync(plain, 'PGDMP');
  const r = t.run('offsite-push.sh', [plain], { BACKUP_REMOTE: 'user@host:/srv/b' });
  assert.notEqual(r.status, 0);
  assert.match(r.out, /\.gpg/);
  assert.ok(!/^(rsync|rclone|ssh) /m.test(t.logText()));
  t.cleanup();
});

test('(3) rsync sobre SSH: user@host:/path, con llave opcional; solo .gpg; state=ok', () => {
  const { t, gpg, status } = setup();
  const r = t.run('offsite-push.sh', [gpg], { BACKUP_REMOTE: 'bkp@10.0.0.9:/srv/unc', BACKUP_SSH_KEY: '/root/.ssh/id_bkp' });
  assert.equal(r.status, 0, r.out);
  const line = t.logText().split('\n').find((l) => l.startsWith('rsync '));
  assert.ok(line, t.logText());
  assert.match(line, /BatchMode=yes/);
  assert.match(line, /-i \/root\/\.ssh\/id_bkp/);
  assert.match(line, /media-20261027T020000Z\.tar\.gz\.gpg/);
  assert.match(line, /bkp@10\.0\.0\.9:\/srv\/unc/);
  assert.match(status(), /state=ok/);
  t.cleanup();
});

test('(4) forma ssh://user@host:2222/path usa el puerto indicado', () => {
  const { t, gpg } = setup();
  const r = t.run('offsite-push.sh', [gpg], { BACKUP_REMOTE: 'ssh://bkp@host.example:2222/srv/unc' });
  assert.equal(r.status, 0, r.out);
  const line = t.logText().split('\n').find((l) => l.startsWith('rsync '));
  assert.match(line, /-p 2222/);
  assert.match(line, /bkp@host\.example:\/srv\/unc/);
  t.cleanup();
});

test('(5) rclone remote:path copia cada .gpg; con rclone ausente falla sin ser fatal', () => {
  const { t, gpg, status } = setup();
  const r = t.run('offsite-push.sh', [gpg], { BACKUP_REMOTE: 'miS3:unc-backups' });
  assert.equal(r.status, 0, r.out);
  assert.match(t.logText(), /^rclone copyto .*media-20261027T020000Z\.tar\.gz\.gpg miS3:unc-backups\/media-20261027T020000Z\.tar\.gz\.gpg/m);
  assert.match(status(), /state=ok/);
  t.removeShim('rclone');
  const r2 = t.run('offsite-push.sh', [gpg], { BACKUP_REMOTE: 'miS3:unc-backups' });
  assert.equal(r2.status, 0, r2.out);
  assert.match(status(), /state=failed/);
  t.cleanup();
});

test('(6) fallo de red: advertencia fuerte, exit 0, state=failed, copia local intacta', () => {
  const { t, gpg, status } = setup();
  const r = t.run('offsite-push.sh', [gpg], { BACKUP_REMOTE: 'bkp@h:/srv', FAKE_RSYNC_FAIL: '1' });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /ADVERTENCIA/);
  assert.match(status(), /state=failed/);
  assert.equal(readFileSync(gpg, 'utf8'), 'CIFRADO');
  t.cleanup();
});

test('(7) BACKUP_REMOTE con metacaracteres de shell: no se ejecuta, state=failed, no imprime la llave', () => {
  const { t, gpg, status } = setup();
  const r = t.run('offsite-push.sh', [gpg], { BACKUP_REMOTE: 'a@b:/x; rm -rf /', BACKUP_SSH_KEY: '/secreto/llave' });
  assert.equal(r.status, 0);
  assert.ok(!/^rsync /m.test(t.logText()));
  assert.match(status(), /state=failed/);
  assert.ok(!r.out.includes('/secreto/llave'));
  assert.ok(!r.out.includes(PASS));
  void delimiter;
  t.cleanup();
});
