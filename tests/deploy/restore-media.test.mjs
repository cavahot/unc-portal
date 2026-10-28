// BACKUP-MEDIA-01 (A, restauración) — scripts/backup/restore-media.sh: verifica, descifra y extrae al volumen.
// Qué hace: crea un respaldo real con backup-media.sh (gpg/tar reales, docker simulado) y lo restaura con
//   restore-media.sh comprobando verificación previa, confirmación, extracción y corrección de dueño (uid 1001).
// Por qué: un respaldo que nunca se probó restaurar no es respaldo; y extraer un archivo manipulado o con la
//   frase equivocada sobre el volumen vivo sería peor que no restaurar. Límite: la extracción real ocurre en un
//   directorio temporal (shim), no en el volumen Docker.
// Spec: docs/specs/backup/BACKUP-MEDIA-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeEnv, PASS, hasGpg } from './_backup-helpers.mjs';

const opts = { skip: !hasGpg };
function backup(t) {
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.equal(r.status, 0, r.out);
  return r.out.match(/^MEDIA_BACKUP=(.*)$/m)[1].trim();
}

test('(1) restaura: verifica sha256, descifra, extrae en el volumen y corrige dueño 1001', opts, () => {
  const t = makeEnv();
  const file = backup(t);
  const r = t.run('restore-media.sh', [file, '--yes'], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.equal(r.status, 0, r.out);
  assert.equal(readFileSync(join(t.dir, 'restored', 'foto1.jpg'), 'utf8'), 'JPEGDATA-1');
  const log = t.logText();
  assert.ok(log.indexOf('EVENT extract') >= 0 && log.indexOf('EVENT chown') > log.indexOf('EVENT extract'));
  assert.match(log, /chown -R 1001:1001 \/app\/media/);
  assert.ok(!r.out.includes(PASS));
  t.cleanup();
});

test('(2) sin --yes y sin responder SI no extrae nada', opts, () => {
  const t = makeEnv();
  const file = backup(t);
  const r = t.run('restore-media.sh', [file], { BACKUP_ENCRYPTION_PASSPHRASE: PASS }, 'no\n');
  assert.equal(r.status, 0, r.out);
  assert.ok(!existsSync(join(t.dir, 'restored')));
  t.cleanup();
});

test('(3) archivo manipulado (sha256 no coincide): aborta antes de extraer', opts, () => {
  const t = makeEnv();
  const file = backup(t);
  writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('X')]));
  const r = t.run('restore-media.sh', [file, '--yes'], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.notEqual(r.status, 0);
  assert.ok(!existsSync(join(t.dir, 'restored')));
  t.cleanup();
});

test('(4) frase de paso equivocada: aborta sin extraer y sin imprimirla', opts, () => {
  const t = makeEnv();
  const file = backup(t);
  const wrong = 'otra-frase-de-paso-distinta-987654';
  const r = t.run('restore-media.sh', [file, '--yes'], { BACKUP_ENCRYPTION_PASSPHRASE: wrong });
  assert.notEqual(r.status, 0);
  assert.ok(!existsSync(join(t.dir, 'restored')));
  assert.ok(!r.out.includes(wrong));
  t.cleanup();
});

test('(5) rechaza un archivo que no es .gpg', () => {
  const t = makeEnv();
  writeFileSync(join(t.dir, 'x.tar.gz'), 'x');
  const r = t.run('restore-media.sh', [join(t.dir, 'x.tar.gz'), '--yes'], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.notEqual(r.status, 0);
  t.cleanup();
});
