// BACKUP-MEDIA-01 (A) — Respaldo cifrado del volumen de media del CMS en el mismo VPS.
// Qué hace: ejecuta scripts/backup/backup-media.sh y backup-prod.sh con gpg/tar reales y docker simulado.
// Por qué: restaurar solo Postgres deja filas `media` sin archivo; y el respaldo del volumen NO puede dejar
//   texto plano en disco (amenaza: copia legible de imágenes y de la BD). Límite: no corre Docker real; la
//   copia en caliente puede capturar un archivo a medio escribir (documentado en docs/BACKUP_RECOVERY.md).
// Spec: docs/specs/backup/BACKUP-MEDIA-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { makeEnv, BASH, PASS, hasGpg, SCRIPTS } from './_backup-helpers.mjs';

const opts = { skip: !hasGpg };
const dec = (file) => spawnSync(BASH, ['-c', `printf %s "$P" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 --decrypt "${file.replace(/\\/g, '/')}"`], { env: { ...process.env, P: PASS }, encoding: 'buffer' });

test('(1) backup-media.sh existe, no pasa la frase por argv y no activa xtrace', () => {
  const p = join(SCRIPTS, 'backup-media.sh');
  assert.ok(existsSync(p), 'falta scripts/backup/backup-media.sh');
  const code = readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.doesNotMatch(code, /--passphrase(\s|=)/);
  assert.doesNotMatch(code, /set -x|xtrace/);
  assert.doesNotMatch(readFileSync(p, 'utf8'), /\r/);
});

test('(2) sin frase de paso falla cerrado, no llama a docker y no crea archivos', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh');
  assert.notEqual(r.status, 0);
  assert.match(r.out, /BACKUP_ENCRYPTION_PASSPHRASE/);
  assert.ok(!/docker exec/.test(t.logText()));
  assert.deepEqual(t.files().filter((f) => f.endsWith('.gpg')), []);
  t.cleanup();
});

test('(3) cifra el volumen: solo queda media-<UTC>.tar.gz.gpg (600), sin texto plano, descifra a un tar legible', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.equal(r.status, 0, r.out);
  const files = t.files();
  const gpg = files.filter((f) => /^media-\d{8}T\d{6}Z\.tar\.gz\.gpg$/.test(f));
  assert.equal(gpg.length, 1, files.join(','));
  // Ningún archivo en claro (.tar, .tar.gz sin .gpg, imágenes) en el destino.
  for (const f of files) assert.ok(/\.gpg(\.sha256)?$|^\./.test(f), `artefacto no cifrado: ${f}`);
  if (process.platform !== 'win32') assert.equal(statSync(join(t.local, gpg[0])).mode & 0o777, 0o600);
  // El contenido cifrado no contiene el texto de los archivos (y sí lo recupera el descifrado).
  assert.ok(!readFileSync(join(t.local, gpg[0])).includes('JPEGDATA-1'));
  const d = dec(join(t.local, gpg[0]));
  assert.equal(d.status, 0);
  const l = spawnSync(BASH, ['-c', 'tar -tzf -'], { input: d.stdout, encoding: 'utf8' });
  assert.match(l.stdout, /foto1\.jpg/);
  assert.match(r.out, /MEDIA_BACKUP=/);
  t.cleanup();
});

test('(4) la frase de paso nunca aparece en la salida ni en las llamadas a docker', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.ok(!r.out.includes(PASS));
  assert.ok(!t.logText().includes(PASS));
  const bad = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: 'corta' });
  assert.notEqual(bad.status, 0);
  assert.ok(!bad.out.includes('corta'));
  t.cleanup();
});

test('(5) si tar falla a medias no deja .gpg parcial y sale != 0', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_TAR_FAIL: '1' });
  assert.notEqual(r.status, 0);
  assert.deepEqual(t.files().filter((f) => f.endsWith('.gpg')), []);
  t.cleanup();
});

test('(6) contenedor y volumen ausentes: código 3 (nada que respaldar) y sin archivos', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_NO_CONTAINER: '1', FAKE_NO_VOLUME: '1' });
  assert.equal(r.status, 3, r.out);
  assert.deepEqual(t.files().filter((f) => f.endsWith('.gpg')), []);
  t.cleanup();
});

test('(7) retención: borra solo media-*.tar.gz.gpg antiguos; respeta ajenos y recientes', opts, () => {
  const t = makeEnv();
  const run1 = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.equal(run1.status, 0, run1.out);
  const recent = t.files().filter((f) => /^media-.*\.gpg$/.test(f));
  const old = (n) => { const p = join(t.local, n); writeFileSync(p, 'x'); const d = new Date(Date.now() - 40 * 86400e3); utimesSync(p, d, d); };
  old('media-20200101T000000Z.tar.gz.gpg');
  old('media-20200101T000000Z.tar.gz.gpg.sha256');
  old('notas-importantes.txt'); // ajeno: nunca se borra
  old('db-20200101T000000Z.dump.gpg'); // patrón de la BD: este script no lo toca
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, BACKUP_RETENTION_DAYS: '14' });
  assert.equal(r.status, 0, r.out);
  const f = t.files();
  assert.ok(!f.includes('media-20200101T000000Z.tar.gz.gpg'));
  assert.ok(!f.includes('media-20200101T000000Z.tar.gz.gpg.sha256'));
  assert.ok(f.includes('notas-importantes.txt'));
  assert.ok(f.includes('db-20200101T000000Z.dump.gpg'));
  for (const x of recent) assert.ok(f.includes(x), 'se borró un respaldo reciente');
  t.cleanup();
});

test('(8) backup-prod.sh: BD cifrada (sin .dump en claro) + media, y avisa que la copia externa no está configurada', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-prod.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, POSTGRES_DB: 'fake_db', POSTGRES_USER: 'fake_user' });
  assert.equal(r.status, 0, r.out);
  const f = t.files();
  assert.ok(f.some((x) => /^db-\d{8}T\d{6}Z\.dump\.gpg$/.test(x)), f.join(','));
  assert.ok(f.some((x) => /^media-\d{8}T\d{6}Z\.tar\.gz\.gpg$/.test(x)));
  assert.ok(!f.some((x) => /\.dump$|\.tar\.gz$|\.tar$/.test(x)), 'quedó texto plano');
  assert.match(r.out, /COPIA EXTERNA NO CONFIGURADA/);
  assert.match(readFileSync(join(t.local, '.offsite-status'), 'utf8'), /state=not_configured/);
  assert.ok(!r.out.includes(PASS));
  t.cleanup();
});

test('(9) backup-prod.sh: si falla pg_dump sale != 0 y no deja .dump.gpg a medias', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-prod.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, POSTGRES_DB: 'd', POSTGRES_USER: 'u', FAKE_PGDUMP_FAIL: '1' });
  assert.notEqual(r.status, 0);
  assert.ok(!t.files().some((x) => x.startsWith('db-')));
  t.cleanup();
});

// ---- Modo volumen (CMS caído): contenedor desechable con el volumen en SOLO LECTURA ----------------------

test('(10) CMS en marcha -> modo exec (docker exec tar), sin contenedor desechable', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS });
  assert.equal(r.status, 0, r.out);
  assert.match(t.logText(), /docker exec unc-cms-prod tar/);
  assert.ok(!/docker run/.test(t.logText()));
  t.cleanup();
});

test('(11) CMS detenido -> modo volumen: docker run --rm con :ro, imagen del contenedor, salida cifrada y sin texto plano', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_CMS_RUNNING: '0' });
  assert.equal(r.status, 0, r.out);
  const run = t.logText().split('\n').find((l) => l.startsWith('docker run'));
  assert.ok(run, t.logText());
  assert.match(run, /-v unc_cms_media_prod:\/app\/media:ro/);
  assert.match(run, /cms-img:test/);
  assert.ok(!/docker exec unc-cms-prod tar/.test(t.logText()));
  const f = t.files();
  assert.ok(f.some((x) => /^media-\d{8}T\d{6}Z\.tar\.gz\.gpg$/.test(x)));
  for (const x of f) assert.ok(/\.gpg(\.sha256)?$|^\./.test(x), `texto plano: ${x}`);
  assert.ok(!r.out.includes(PASS));
  t.cleanup();
});

test('(12) sin contenedor pero con volumen: usa la imagen IMAGE_TAG del CMS si está local; si no, una imagen con tar', opts, () => {
  const t = makeEnv();
  const a = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_NO_CONTAINER: '1', IMAGE_TAG: 'sha-abc1234', FAKE_LOCAL_IMAGES: 'ghcr.io/cavahot/unc-portal-cms:sha-abc1234' });
  assert.equal(a.status, 0, a.out);
  assert.match(t.logText(), /docker run .*ghcr\.io\/cavahot\/unc-portal-cms:sha-abc1234/);
  const t2 = makeEnv();
  const b = t2.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_NO_CONTAINER: '1', FAKE_LOCAL_IMAGES: 'nginx:1.27-alpine' });
  assert.equal(b.status, 0, b.out);
  assert.match(t2.logText(), /docker run .*nginx:1\.27-alpine/);
  t.cleanup(); t2.cleanup();
});

test('(13) modo volumen sin ninguna imagen local con tar: falla cerrado en español, sin docker run ni archivos', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_CMS_RUNNING: '0', FAKE_LOCAL_IMAGES: '' });
  assert.notEqual(r.status, 0);
  assert.match(r.out, /imagen/i);
  assert.ok(!/docker run/.test(t.logText()));
  assert.deepEqual(t.files().filter((x) => x.endsWith('.gpg')), []);
  t.cleanup();
});

test('(14) modo volumen: un tar que falla a medias no deja .gpg', opts, () => {
  const t = makeEnv();
  const r = t.run('backup-media.sh', [], { BACKUP_ENCRYPTION_PASSPHRASE: PASS, FAKE_CMS_RUNNING: '0', FAKE_TAR_FAIL: '1' });
  assert.notEqual(r.status, 0);
  assert.deepEqual(t.files().filter((x) => x.endsWith('.gpg')), []);
  t.cleanup();
});
