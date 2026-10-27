// MIN-01 — MinIO OPCIONAL en producción (perfil de Compose `s3`).
// Qué hace: lee compose.prod.yaml y deploy.yml (YAML parseado) y exige: (1) `minio` con
//   `profiles: [s3]`; (2) `cms` sin depends_on a minio; (3) deploy.yml no nombra `minio` en el `up -d`
//   (nombrar un servicio con perfil lo ACTIVA y arrastraría su imagen); (4) la imagen sin fijar queda
//   señalada como DEP-11 pendiente (no se inventa un tag); (5) el nginx ya no depende de minio al arrancar
//   (ver nginx-cms-limits.test.mjs).
// Por qué: la imagen quay.io/minio/minio:latest no está disponible y `depends_on: service_healthy` hacía
//   que el CMS no arrancara aunque MEDIA_STORAGE=local no use MinIO. Límite: no ejecuta `docker compose
//   config` (Docker no se toca en este paso): el comportamiento real del perfil queda sin verificar.
//   Se evita `depends_on.required: false` porque exige Compose >= 2.20 y DEPLOY.md solo pide «v2.x».
// Tarea: MIN-01 | Spec: MIG-IMG §16.3 y §16.8
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const COMPOSE_TEXT = read('infrastructure/docker/compose.prod.yaml');
const COMPOSE = yaml.load(COMPOSE_TEXT);
const DEPLOY = read('.github/workflows/deploy.yml');

test('(1) el servicio minio pertenece al perfil s3 (no arranca con el `up` por defecto)', () => {
  assert.deepEqual(COMPOSE.services.minio.profiles, ['s3']);
});

test('(2) ningún servicio por defecto depende de minio', () => {
  for (const [name, svc] of Object.entries(COMPOSE.services)) {
    if (svc.profiles?.length) continue;
    const deps = Array.isArray(svc.depends_on) ? svc.depends_on : Object.keys(svc.depends_on ?? {});
    assert.ok(!deps.includes('minio'), `${name} depende de minio`);
  }
});

test('(3) deploy.yml no nombra `minio` como argumento del up -d (activaría el perfil)', () => {
  const up = DEPLOY.split('\n').find((l) => /up -d --no-deps --remove-orphans/.test(l));
  assert.ok(up, 'no se halló el up -d del deploy');
  assert.doesNotMatch(up, /\bminio\b/);
  for (const s of ['postgres', 'cms', 'portal', 'nginx']) assert.match(up, new RegExp(`\\b${s}\\b`));
});

test('(4) la imagen de minio sigue sin fijar PERO señalada como DEP-11 pendiente (no se inventa un tag)', () => {
  const lines = COMPOSE_TEXT.split('\n');
  const i = lines.findIndex((l) => /^\s+image:\s+quay\.io\/minio\/minio:latest/.test(l));
  assert.ok(i > 0, 'la imagen no debe cambiarse sin un tag verificable');
  const above = lines.slice(Math.max(0, i - 6), i).join('\n');
  assert.match(above, /DEP-11 pendiente/);
});

test('(5) las variables S3/MinIO del ancla del CMS no obligan a definirlas (default vacío) con el perfil apagado', () => {
  for (const v of ['S3_BUCKET', 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD', 'S3_PUBLIC_URL']) {
    const refs = [...COMPOSE_TEXT.matchAll(new RegExp(`\\$\\{${v}([^}]*)\\}`, 'g'))].map((m) => m[1]);
    assert.ok(refs.length > 0, v);
    for (const r of refs) assert.match(r, /^:-/, `${v} sin default: Compose avisa de variable vacía en cada up`);
  }
});
