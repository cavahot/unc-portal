// S3-SEAWEEDFS-01 (antes MIN-01) — almacén S3 OPCIONAL en producción (perfil de Compose `s3`), ahora SeaweedFS.
// Qué hace: lee compose.yaml, compose.prod.yaml y deploy.yml (YAML parseado) y exige: (1) servicio `s3` con
//   `profiles: [s3]`; (2) ningún servicio por defecto depende de `s3`; (3) deploy.yml no nombra `s3` en el
//   `up -d` (nombrar un servicio con perfil lo ACTIVA); (4) imagen fijada por digest sha256 (nunca `latest`);
//   (5) las variables S3_* del ancla del CMS llevan default vacío; (6) el contenedor lee las claves del entorno
//   vía entrypoint versionado (el JSON de identidades NO se versiona con claves); (7) healthcheck a /healthz
//   (GET / devuelve 403 sin firmar); (8) sin puertos publicados en prod y solo loopback en local.
// Por qué: quay.io/minio/minio ya no es descargable (401) y `depends_on: service_healthy` hacía que el CMS no
//   arrancara aunque MEDIA_STORAGE=local no use S3. Límite: no ejecuta `docker compose config` (eso se verifica
//   aparte, en un proyecto aislado). Se evita `depends_on.required: false` (exige Compose >= 2.20).
// Tarea: S3-SEAWEEDFS-01 | Spec: docs/specs/storage/S3-SEAWEEDFS-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const COMPOSE_TEXT = read('infrastructure/docker/compose.prod.yaml');
const COMPOSE = yaml.load(COMPOSE_TEXT);
const LOCAL = yaml.load(read('infrastructure/docker/compose.yaml'));
const DEPLOY = read('.github/workflows/deploy.yml');
const IMAGE = /^chrislusf\/seaweedfs:\d+\.\d+@sha256:[0-9a-f]{64}$/;

test('(1) el servicio s3 pertenece al perfil s3 (no arranca con el `up` por defecto)', () => {
  assert.deepEqual(COMPOSE.services.s3.profiles, ['s3']);
  assert.equal(COMPOSE.services.s3.container_name, 'unc-s3-prod');
  assert.equal(COMPOSE.services.minio, undefined, 'MinIO ya no existe en el compose');
});

test('(2) ningún servicio por defecto depende de s3', () => {
  for (const [name, svc] of Object.entries(COMPOSE.services)) {
    if (svc.profiles?.length) continue;
    const deps = Array.isArray(svc.depends_on) ? svc.depends_on : Object.keys(svc.depends_on ?? {});
    assert.ok(!deps.includes('s3'), `${name} depende de s3`);
  }
});

test('(3) deploy.yml no nombra `s3` como argumento del up -d (activaría el perfil)', () => {
  const up = DEPLOY.split('\n').find((l) => /up -d --no-deps --remove-orphans/.test(l));
  assert.ok(up, 'no se halló el up -d del deploy');
  assert.doesNotMatch(up, /\b(s3|minio)\b/);
  for (const s of ['postgres', 'cms', 'portal', 'nginx']) assert.match(up, new RegExp(`\\b${s}\\b`));
});

test('(4) la imagen de SeaweedFS está fijada por digest sha256 (prod y local), sin latest', () => {
  assert.match(COMPOSE.services.s3.image, IMAGE);
  assert.match(LOCAL.services.s3.image, IMAGE);
  assert.equal(COMPOSE.services.s3.image, LOCAL.services.s3.image, 'prod y local deben usar la misma imagen verificada');
  assert.doesNotMatch(COMPOSE_TEXT.replace(/^\s*#.*$/gm, ''), /:latest\b/);
});

test('(5) las variables S3_* del ancla del CMS no obligan a definirlas (default vacío) con el perfil apagado', () => {
  for (const v of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL']) {
    const refs = [...COMPOSE_TEXT.matchAll(new RegExp(`\\$\\{${v}([^}]*)\\}`, 'g'))].map((m) => m[1]);
    assert.ok(refs.length > 0, v);
    for (const r of refs) assert.match(r, /^:-/, `${v} sin default: Compose avisa de variable vacía en cada up`);
  }
  assert.doesNotMatch(COMPOSE_TEXT, /MINIO_/);
});

test('(6) el contenedor s3 arranca con el entrypoint versionado y recibe las claves del entorno', () => {
  for (const svc of [COMPOSE.services.s3, LOCAL.services.s3]) {
    assert.deepEqual(svc.entrypoint, ['/bin/sh', '/s3-entrypoint.sh']);
    assert.ok(svc.volumes.some((v) => /s3\/entrypoint\.sh:\/s3-entrypoint\.sh:ro$/.test(v)), 'entrypoint montado de solo lectura en una ruta propia (si pisara /entrypoint.sh de la imagen entraría en bucle)');
    assert.ok(existsSync(resolve(ROOT, 'infrastructure/docker/s3/entrypoint.sh')));
  }
  const env = COMPOSE.services.s3.environment;
  assert.ok('S3_ACCESS_KEY_ID' in env && 'S3_SECRET_ACCESS_KEY' in env && 'S3_BUCKET' in env);
});

test('(7) healthcheck a /healthz en 8333 (GET / responde 403 sin firmar)', () => {
  for (const svc of [COMPOSE.services.s3, LOCAL.services.s3]) {
    const t = svc.healthcheck.test.join(' ');
    assert.match(t, /wget/);
    assert.match(t, /127\.0\.0\.1:8333\/healthz/);
  }
});

test('(8) prod no publica puertos; local solo en loopback 9100->8333; volumen s3_data', () => {
  assert.equal(COMPOSE.services.s3.ports, undefined);
  assert.deepEqual(LOCAL.services.s3.ports, ['127.0.0.1:9100:8333']);
  assert.equal(LOCAL.services.s3.container_name, 'unc-s3-local');
  assert.ok(COMPOSE.volumes.s3_data && LOCAL.volumes.s3_data);
  assert.equal(COMPOSE.volumes.minio_data, undefined);
  assert.equal(LOCAL.volumes.minio_data, undefined);
});

test('(9) el CMS apunta al servicio s3 por la red interna', () => {
  assert.match(COMPOSE_TEXT, /S3_ENDPOINT:\s+http:\/\/s3:8333/);
});
