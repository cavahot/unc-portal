// SEC-027 (staging sintético, opción B) — aislamiento de staging respecto de producción en el MISMO servidor.
// Qué hace: lee compose.staging.yaml, compose.prod.yaml, el ejemplo de entorno y .gitignore, y exige que staging
//   no comparta nombres de proyecto, contenedores, volúmenes ni red con producción; que publique puertos solo en
//   127.0.0.1 y solo los dos previstos; que no tenga nginx, S3 ni imágenes de producción; que su entorno de ejemplo
//   no traiga secretos reales y que `.env.staging` no pueda versionarse.
// Amenazas: (1) un `up` de staging que reemplace o comparta contenedores, volúmenes o la red de producción;
//   (2) staging abierto a internet con datos de prueba; (3) staging que escriba en el bucket S3 o envíe correo reales;
//   (4) secretos de staging versionados o copiados de producción.
// Límite: análisis estático del YAML; no ejecuta `docker compose config` ni levanta contenedores (eso se verifica en
//   el servidor con docs/deploy/STAGING.md). No prueba nginx, TLS ni el límite de tasa.
// Tarea: SEC-027 | Spec: docs/specs/deploy/STAGING.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const STAGING_TEXT = read('infrastructure/docker/compose.staging.yaml');
const STAGING = yaml.load(STAGING_TEXT);
const PROD = yaml.load(read('infrastructure/docker/compose.prod.yaml'));
const ENV_EXAMPLE = read('infrastructure/docker/.env.staging.example');

const names = (compose, key) => Object.values(compose.services ?? {}).map((s) => s[key]).filter(Boolean);
const volumeNames = (compose) => Object.values(compose.volumes ?? {}).map((v) => v?.name).filter(Boolean);

test('(1) proyecto, contenedores, volúmenes y red no se comparten con producción', () => {
  assert.equal(STAGING.name, 'unc-staging');
  assert.notEqual(STAGING.name, PROD.name);
  const stagingContainers = names(STAGING, 'container_name');
  assert.ok(stagingContainers.length >= 4);
  for (const c of stagingContainers) {
    assert.match(c, /-staging$/, `contenedor ${c} debe terminar en -staging`);
    assert.ok(!names(PROD, 'container_name').includes(c), `${c} choca con producción`);
  }
  for (const v of volumeNames(STAGING)) {
    assert.match(v, /_staging$/, `volumen ${v} debe terminar en _staging`);
    assert.ok(!volumeNames(PROD).includes(v), `${v} choca con producción`);
  }
  assert.equal(STAGING.networks.internal.name, 'unc-staging-internal');
  assert.notEqual(STAGING.networks.internal.name, PROD.networks.internal.name);
});

test('(2) solo publica el portal y el CMS, y únicamente en 127.0.0.1 (se entra por túnel SSH)', () => {
  const published = Object.entries(STAGING.services).flatMap(([svc, s]) => (s.ports ?? []).map((p) => [svc, String(p)]));
  assert.deepEqual(published.map(([svc]) => svc).sort(), ['cms', 'portal']);
  for (const [svc, p] of published) assert.match(p, /^127\.0\.0\.1:310[02]:3000$/, `${svc} publica ${p}`);
  assert.ok(!/(^|["'\s])(80|443):/.test(STAGING_TEXT.replace(/#.*$/gm, '')), 'no puede tomar los puertos 80/443 de producción');
});

test('(3) sin nginx, sin S3 y sin imágenes de producción', () => {
  assert.equal(STAGING.services.nginx, undefined);
  assert.equal(STAGING.services.s3, undefined);
  for (const [svc, s] of Object.entries(STAGING.services)) {
    if (s.image) assert.ok(!s.image.includes('ghcr.io'), `${svc} no debe usar imágenes publicadas por el CI de producción`);
  }
  const env = STAGING['x-cms-env'];
  assert.equal(env.MEDIA_STORAGE, 'local');
  assert.equal(env.N8N_WEBHOOK_URL, '');
  assert.ok(!('S3_ENDPOINT' in env) && !('S3_PUBLIC_URL' in env), 'el CMS de staging no apunta a ningún S3');
});

test('(4) la base de datos es propia y el portal no reutiliza el DSN de Sentry de producción', () => {
  assert.equal(STAGING.services.postgres.container_name, 'unc-postgres-staging');
  assert.equal(STAGING.services.portal.environment.NEXT_PUBLIC_SENTRY_DSN, '');
  assert.ok(!/\.env\.prod/.test(STAGING_TEXT.replace(/#.*$/gm, '')), 'staging no lee .env.prod');
});

test('(5) el entorno de ejemplo solo trae marcadores, URLs de loopback y correo sin destino real', () => {
  const lines = ENV_EXAMPLE.split('\n').filter((l) => /^[A-Z_0-9]+=/.test(l));
  const get = (k) => lines.find((l) => l.startsWith(`${k}=`))?.slice(k.length + 1);
  for (const k of ['PAYLOAD_SECRET', 'PREVIEW_SECRET', 'REVALIDATION_SECRET', 'POSTGRES_PASSWORD']) {
    assert.match(get(k) ?? '', /^REEMPLAZAR_/, `${k} debe ser un marcador`);
  }
  assert.match(get('DATABASE_URI'), /REEMPLAZAR_/);
  for (const k of ['PORTAL_PUBLIC_URL', 'CMS_PUBLIC_URL', 'MEDIA_PUBLIC_ORIGIN']) {
    assert.match(get(k), /^http:\/\/localhost:310[02]$/, `${k} apunta solo a loopback`);
  }
  assert.ok(!/unc\.edu\.py/.test(ENV_EXAMPLE.replace(/#.*$/gm, '')), 'ningún valor apunta a dominios de producción');
  assert.match(get('CONTACT_TO'), /@example\.test$/);
  assert.equal(get('POSTGRES_DB'), 'unc_portal_staging');
});

test('(6) toda variable que interpola el compose existe en el ejemplo (o tiene valor por defecto)', () => {
  const declared = new Set([...ENV_EXAMPLE.matchAll(/^([A-Z_0-9]+)=/gm)].map((m) => m[1]));
  const code = STAGING_TEXT.replace(/#.*$/gm, '');
  const required = [...code.matchAll(/\$\{([A-Z_0-9]+)\}/g)].map((m) => m[1]);
  const missing = [...new Set(required)].filter((v) => !declared.has(v));
  assert.deepEqual(missing, [], `variables sin declarar en .env.staging.example: ${missing.join(', ')}`);
});

test('(7) `.env.staging` no se puede versionar', () => {
  assert.match(read('.gitignore'), /^infrastructure\/docker\/\.env\.staging$/m);
});
