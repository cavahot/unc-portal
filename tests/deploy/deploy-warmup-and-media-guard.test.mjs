// ISR / MIN-01: (1) el deploy calienta las páginas CMS tras el gate; (2) un guard previo impide el cambio
// silencioso de S3 a volumen local cuando .env.prod tiene MINIO_ROOT_USER pero no MEDIA_STORAGE.
// Amenaza que evita: (1) HTML horneado en «no disponible» tras un build sin CMS; (2) subidas nuevas al volumen local
// mientras el catálogo apunta a objetos en MinIO. Límite: (1) análisis estático del workflow; (2) la función se
// extrae del workflow y se ejecuta con bash sobre archivos .env temporales (sin Docker ni red).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const YML = readFileSync(resolve(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const ROUTE = readFileSync(resolve(ROOT, 'app', 'api', 'revalidate', 'route.ts'), 'utf8');

function extractGuard() {
  const m = YML.match(/media_storage_guard\(\) \{[\s\S]*?\n {12}\}/);
  assert.ok(m, 'debe existir la función media_storage_guard en deploy.yml');
  return m[0];
}

function runGuard(envText) {
  const dir = mkdtempSync(join(tmpdir(), 'guard-'));
  const f = join(dir, '.env.prod');
  writeFileSync(f, envText);
  const r = spawnSync('bash', ['-c', `${extractGuard()}\nmedia_storage_guard "$1"`, 'x', f], { encoding: 'utf8' });
  return r;
}

test('guard: MINIO_ROOT_USER definido y MEDIA_STORAGE ausente -> falla', () => {
  const r = runGuard('POSTGRES_DB=x\nMINIO_ROOT_USER=admin\n');
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /MEDIA_STORAGE/);
  assert.ok(!(r.stdout + r.stderr).includes('admin'), 'no debe imprimir el valor');
});

test('guard: MEDIA_STORAGE vacío cuenta como ausente -> falla', () => {
  assert.notEqual(runGuard('MINIO_ROOT_USER=admin\nMEDIA_STORAGE=\n').status, 0);
});

test('guard: MINIO_ROOT_USER definido y MEDIA_STORAGE=s3 o local -> pasa', () => {
  assert.equal(runGuard('MINIO_ROOT_USER=admin\nMEDIA_STORAGE=s3\n').status, 0);
  assert.equal(runGuard('MINIO_ROOT_USER=admin\r\nMEDIA_STORAGE="local"\r\n').status, 0);
});

test('guard: sin MINIO_ROOT_USER (o vacío) -> pasa', () => {
  assert.equal(runGuard('POSTGRES_DB=x\n').status, 0);
  assert.equal(runGuard('MINIO_ROOT_USER=\n').status, 0);
});

test('el guard se invoca antes del pull, de migrate y del up', () => {
  const call = YML.indexOf('media_storage_guard infrastructure/docker/.env.prod');
  assert.ok(call > 0, 'debe invocarse con el env file de producción');
  assert.ok(call < YML.indexOf('\n              pull'), 'antes del pull');
  assert.ok(call < YML.indexOf('run --rm -T --name unc-cms-migrate-prod'), 'antes de migrate');
  assert.ok(call < YML.indexOf('up -d --no-deps --remove-orphans'), 'antes del up');
});

test('warm-up: paso no fatal posterior al health check, con Bearer y todas las etiquetas', () => {
  const idx = YML.indexOf('name: Warm-up');
  assert.ok(idx > YML.indexOf('name: Health check'), 'el warm-up va después del health check');
  const step = YML.slice(idx);
  assert.match(step, /continue-on-error:\s*true/);
  assert.match(step, /\/api\/revalidate/);
  assert.match(step, /Authorization: Bearer/);
  assert.match(step, /::warning::/);
  assert.ok(!/set -e/.test(step), 'no debe abortar');
  assert.ok(!/echo[^\n]*\$\{?SECRET/.test(step), 'no imprime el secreto');
  for (const p of ['/es/autoridades', '/es/convenios']) assert.ok(step.includes(p), p);
});

test('warm-up: cada etiqueta enviada existe en ALLOWED_TAGS de la ruta', () => {
  const step = YML.slice(YML.indexOf('name: Warm-up'));
  const m = step.match(/WARM_TAGS="([^"]+)"/);
  assert.ok(m, 'debe declarar WARM_TAGS');
  const tags = m[1].trim().split(/\s+/);
  assert.ok(tags.length >= 14);
  for (const t of tags) assert.ok(ROUTE.includes(`'${t}'`), `etiqueta no permitida: ${t}`);
});
