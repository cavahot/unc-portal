// S3-SEAWEEDFS-01 — entrypoint del contenedor SeaweedFS (infrastructure/docker/s3/entrypoint.sh).
// Qué hace: ejecuta el script real con bash y un «entrypoint de imagen» falso (S3_IMAGE_ENTRYPOINT) que solo
//   vuelca sus argumentos; comprueba que (1) falla cerrado con claves vacías, cortas o con caracteres que
//   romperían el JSON, sin imprimir nunca su valor; (2) renderiza el JSON de identidades desde el entorno
//   (identidad `cms` completa; `anonymous` SOLO con S3_PUBLIC_READ=1 y solo `Read:<bucket>`); (3) delega en el
//   entrypoint de la imagen con los flags validados en el spike.
// Por qué: el JSON de identidades no se versiona con claves (SEC-MINIO-01: una clave en git queda para siempre).
//   Amenaza que evita: arrancar el almacén con credenciales vacías/débiles o con lectura anónima por omisión.
// Límite: no arranca Docker ni SeaweedFS (eso se verifica aparte, en un proyecto Compose aislado).
// Tarea: S3-SEAWEEDFS-01 | Spec: docs/specs/storage/S3-SEAWEEDFS-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync, chmodSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = resolve(ROOT, 'infrastructure', 'docker', 's3', 'entrypoint.sh');
const fwd = (p) => p.replace(/\\/g, '/');
// Claves sintéticas generadas en el momento: ningún valor real ni reutilizable.
const AK = 'AK' + 'a1b2c3d4e5f6a7b8c9d0';
const SK = 'SK' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8';

function run(env) {
  const dir = mkdtempSync(join(tmpdir(), 's3ep-'));
  const fake = join(dir, 'fake-entrypoint.sh');
  writeFileSync(fake, '#!/bin/sh\nprintf "%s\\n" "$@" > "$(dirname "$0")/args.txt"\n');
  chmodSync(fake, 0o755);
  const cfg = join(dir, 's3.json');
  const r = spawnSync('bash', [fwd(SCRIPT)], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, S3_IMAGE_ENTRYPOINT: fwd(fake), S3_CONFIG_PATH: fwd(cfg), ...env },
  });
  const argsFile = join(dir, 'args.txt');
  return {
    r,
    out: r.stdout + r.stderr,
    args: existsSync(argsFile) ? readFileSync(argsFile, 'utf8').trim().split('\n') : null,
    json: existsSync(cfg) ? JSON.parse(readFileSync(cfg, 'utf8')) : null,
  };
}

test('el script existe y no contiene ninguna clave', () => {
  assert.ok(existsSync(SCRIPT), 'falta infrastructure/docker/s3/entrypoint.sh');
  const text = readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(text, /\r/, 'debe tener finales LF (se ejecuta con sh dentro del contenedor)');
  assert.doesNotMatch(text, /"accessKey"\s*:\s*"[A-Za-z0-9]{8,}"/);
  const siblings = readdirSync(dirname(SCRIPT));
  assert.deepEqual(siblings.filter((f) => f.endsWith('.json')), [], 'no se versiona ningún JSON de identidades');
});

test('falla cerrado con claves vacías o ausentes, sin arrancar weed', () => {
  for (const env of [{}, { S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '' }, { S3_ACCESS_KEY_ID: AK }, { S3_SECRET_ACCESS_KEY: SK }]) {
    const t = run(env);
    assert.notEqual(t.r.status, 0);
    assert.equal(t.args, null, 'no debe delegar en la imagen');
    assert.match(t.out, /S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY/);
  }
});

test('falla cerrado con claves cortas (16/32) y no imprime su valor', () => {
  const shortAk = run({ S3_ACCESS_KEY_ID: 'cortaK123456789', S3_SECRET_ACCESS_KEY: SK });
  assert.notEqual(shortAk.r.status, 0);
  assert.ok(!shortAk.out.includes('cortaK123456789'));
  const shortSk = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: 'secretoCorto1234567890123456789' });
  assert.notEqual(shortSk.r.status, 0);
  assert.ok(!shortSk.out.includes('secretoCorto1234567890123456789'));
  assert.equal(shortSk.args, null);
});

test('rechaza caracteres que romperían el JSON (comillas, barra, espacios) sin imprimirlos', () => {
  const evil = SK.slice(0, 20) + '"},{"name":"x' + SK.slice(20);
  const t = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: evil });
  assert.notEqual(t.r.status, 0);
  assert.equal(t.args, null);
  assert.ok(!t.out.includes(evil));
});

test('sin S3_PUBLIC_READ: solo la identidad cms, sin acceso anónimo', () => {
  const t = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: SK });
  assert.equal(t.r.status, 0, t.out);
  assert.deepEqual(t.json.identities.map((i) => i.name), ['cms']);
  assert.deepEqual(t.json.identities[0].actions, ['Admin', 'Read', 'Write', 'List', 'Tagging']);
  assert.equal(t.json.identities[0].credentials[0].accessKey, AK);
  assert.ok(!t.out.includes(SK) && !t.out.includes(AK), 'no imprime las claves');
});

test('con S3_PUBLIC_READ=1: anonymous con SOLO Read:<bucket> (por defecto unc-media)', () => {
  const t = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: SK, S3_PUBLIC_READ: '1' });
  assert.equal(t.r.status, 0, t.out);
  const anon = t.json.identities.find((i) => i.name === 'anonymous');
  assert.deepEqual(anon.actions, ['Read:unc-media']);
  assert.equal(anon.credentials, undefined);
  const t2 = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: SK, S3_PUBLIC_READ: '1', S3_BUCKET: 'medios-test' });
  assert.deepEqual(t2.json.identities.find((i) => i.name === 'anonymous').actions, ['Read:medios-test']);
});

test('un valor de S3_PUBLIC_READ distinto de 1 no abre lectura anónima; un bucket inválido falla', () => {
  const t = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: SK, S3_PUBLIC_READ: 'true' });
  assert.deepEqual(t.json.identities.map((i) => i.name), ['cms']);
  const bad = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: SK, S3_PUBLIC_READ: '1', S3_BUCKET: 'Bad Bucket"' });
  assert.notEqual(bad.r.status, 0);
  assert.equal(bad.args, null);
});

test('delega en el entrypoint de la imagen con los flags del spike', () => {
  const t = run({ S3_ACCESS_KEY_ID: AK, S3_SECRET_ACCESS_KEY: SK });
  assert.ok(t.args, t.out);
  assert.equal(t.args[0], 'server');
  for (const flag of ['-s3', '-dir=/data', '-ip.bind=0.0.0.0', '-volume.max=0', '-master.volumeSizeLimitMB=1024']) {
    assert.ok(t.args.includes(flag), `falta ${flag}`);
  }
  assert.ok(t.args.some((a) => /^-s3\.config=.+s3\.json$/.test(a)));
});
