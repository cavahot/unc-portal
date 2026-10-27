// SEC-REVIEW (ARR-01 expand/contract): el gate de readiness del deploy, además de /api/health/ready (SELECT 1), debe
// leer una colección real del CMS. Amenaza: una migración que deja el esquema incompatible con la imagen (por ejemplo
// una columna renombrada) pasa el SELECT 1 pero responde 500 en las rutas de datos; sin esta prueba el rollback de
// imagen podría darse por «recuperado» estando roto. Límite: la función se extrae del workflow y se ejecuta con bash
// con el acceso al contenedor sustituido por un stub (sin Docker ni red); el `docker exec` real no se ejercita aquí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const YML = readFileSync(resolve(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');

function extract(name) {
  const m = YML.match(new RegExp(`${name}\\(\\) \\{[\\s\\S]*?\\n {12}\\}`));
  assert.ok(m, `debe existir la función ${name} en deploy.yml`);
  return m[0];
}

// Ejecuta el smoke con `dep09_cms_fetch` sustituido por el stub indicado.
function runSmoke(stub) {
  const script = `${extract('dep09_cms_fetch')}\n${extract('dep09_cms_collection_smoke')}\ndep09_cms_fetch() { ${stub}; }\ndep09_cms_collection_smoke`;
  return spawnSync('bash', ['-c', script], { encoding: 'utf8' });
}

test('smoke: 200 con JSON que contiene "docs" -> pasa', () => {
  assert.equal(runSmoke(`printf '{"docs":[],"totalDocs":0}'`).status, 0);
  assert.equal(runSmoke(`printf '{"docs":[{"id":1}],"limit":1}'`).status, 0);
});

test('smoke: 500 (el fetch sale != 0) -> falla', () => {
  assert.notEqual(runSmoke(`printf 'error'; return 1`).status, 0);
});

test('smoke: 200 sin "docs" -> falla', () => {
  assert.notEqual(runSmoke(`printf '{"message":"ok"}'`).status, 0);
  assert.notEqual(runSmoke(`printf ''`).status, 0);
});

test('el fetch real usa la red interna del contenedor y la colección aranceles-rectorado, sin puertos nuevos', () => {
  const f = extract('dep09_cms_fetch');
  assert.match(f, /docker exec unc-cms-prod wget/);
  assert.match(f, /127\.0\.0\.1:3000\/api\/aranceles-rectorado\?limit=1/);
});

test('el smoke participa en el gate previo y en el posterior al rollback', () => {
  const ready = extract('dep09_ready');
  assert.match(ready, /dep09_cms_collection_smoke/);
  // Mismo dep09_wait_ready en el gate tras `up -d` y en el gate tras el rollback (dos usos fuera de la definición).
  const uses = YML.split('dep09_wait_ready').length - 1;
  assert.ok(uses >= 3, 'definición + gate previo + gate posterior al rollback');
  const rollbackAt = YML.indexOf('ROLLBACK_RC" -eq 0 ] && dep09_wait_ready');
  assert.ok(rollbackAt > YML.indexOf('dep09_cms_collection_smoke'), 'el rollback usa el mismo gate');
});
