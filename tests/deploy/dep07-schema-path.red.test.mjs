// DEP-07 — RED independiente de la vía (A/B/C) para «camino único y reproducible de esquema».
// Qué hace: lee (sin ejecutar) migraciones, deploy.yml y apps/cms/Dockerfile y exige invariantes
//   que CUALQUIER vía elegida debe cumplir. Sin Postgres, Docker, red ni paquetes nuevos.
// Por qué: hallazgo C4 de AUDIT-DEPLOY-2026-10-19 — hoy el deploy no migra, el `down` del baseline
//   borra todo con CASCADE sin precondición y la imagen del CMS no puede ejecutar `payload migrate`.
// Límite: análisis textual; no prueba que `migrate` funcione (eso exige Postgres sintético autorizado).
// Spec: docs/specs/deploy/DEP-07-via-unica-de-esquema.md | RDD: RDD-DEP-16..RDD-DEP-21
//
// Ejecutar (aislado de `npm test`, que solo recoge tests/unit/**/*.spec.ts):
//   node --test tests/deploy/dep07-schema-path.red.test.mjs
// Los describe «RED» DEBEN fallar hasta que se implemente GREEN; el describe «verde» debe pasar hoy.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const MIGRATIONS_DIR = 'apps/cms/src/migrations';

// ---------------------------------------------------------------------------
// Funciones puras (con fixtures buena/mala más abajo para probar los propios chequeos)
// ---------------------------------------------------------------------------

/** Quita comentarios de línea (# yaml/shell, // ts) para que un comentario no simule un control. */
const stripLineComments = (text) => text.replace(/^\s*(#|\/\/).*$/gm, '');

/** Nombres de migración declarados en index.ts (campo `name: '...'`). */
export function indexNames(indexSource) {
  return [...stripLineComments(indexSource).matchAll(/name\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]).sort();
}

/** Nombres base de archivos de migración reales (.ts salvo index.ts). */
export function fileMigrationNames(files) {
  return files.filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, '')).sort();
}

/**
 * Deriva entre index.ts y el directorio: faltantes en el índice, huérfanos en el índice y
 * archivos .ts sin snapshot .json hermano (Payload usa el .json para diffs de `migrate:create`).
 */
export function migrationDrift(indexSource, files) {
  const inIndex = indexNames(indexSource);
  const onDisk = fileMigrationNames(files);
  const findings = [];
  for (const n of onDisk) if (!inIndex.includes(n)) findings.push(`${n}.ts no está en index.ts`);
  for (const n of inIndex) if (!onDisk.includes(n)) findings.push(`index.ts exporta ${n} sin archivo .ts`);
  for (const n of onDisk) if (!files.includes(`${n}.json`)) findings.push(`${n}.ts sin snapshot ${n}.json`);
  return findings;
}

/** Cuerpo de `export async function down` (hasta el final del archivo; el baseline lo declara al final). */
export function downBody(migrationSource) {
  const i = migrationSource.search(/export\s+async\s+function\s+down\b/);
  return i < 0 ? null : migrationSource.slice(i);
}

/**
 * Un `down` es seguro si NO destruye (sin DROP) o si ANTES del primer DROP hay una precondición
 * explícita de «BD vacía/permitida» que aborta: `throw new Error`, `RAISE EXCEPTION` o `process.env`
 * de confirmación. Amenaza: ejecutar `migrate:down` / `migrate:reset` / `migrate:refresh` en
 * producción y borrar 64 tablas con datos.
 */
export function downHasEmptyDbGuard(migrationSource) {
  const body = downBody(migrationSource);
  if (body === null) return { ok: false, reason: 'no hay función down' };
  const firstDrop = body.search(/DROP\s+(TABLE|TYPE|SCHEMA)\b/i);
  if (firstDrop < 0) return { ok: true, reason: 'sin DROP' };
  const before = body.slice(0, firstDrop);
  const guarded = /throw\s+new\s+Error|RAISE\s+EXCEPTION/i.test(before)
    && /count\s*\(|NOT\s+EXISTS|IS\s+EMPTY|information_schema|pg_class|rowCount|\.length\s*===?\s*0/i.test(before);
  return guarded
    ? { ok: true, reason: 'precondición antes del primer DROP' }
    : { ok: false, reason: 'DROP sin precondición de BD vacía antes del primer DROP' };
}

/** Líneas efectivas (sin comentarios) del script del paso de deploy. */
// Une continuaciones de shell (barra invertida + salto) para que `docker compose ... up` multilínea sea una línea.
const effective = (workflow) => stripLineComments(workflow).replace(/\\\s*\n\s*/g, ' ');

/**
 * Orden exigido en deploy.yml: pg_dump (verificado) → migrate explícito → up. Además migrate no
 * puede neutralizarse con `|| true` y el script debe abortar ante error (`set -e`).
 * Devuelve findings; vacío = cumple.
 */
export function deployOrderFindings(workflow) {
  const text = effective(workflow);
  const findings = [];
  const idx = (re) => text.search(re);
  const dump = idx(/pg_dump/);
  const verify = idx(/pg_restore\s+--list|pg_restore\s+-l\b/);
  const migrate = idx(/\bmigrate\b(?!:)/);
  const up = idx(/compose\b[^\n]*\sup\b/);
  if (dump < 0) findings.push('falta pg_dump previo en deploy.yml');
  if (dump >= 0 && verify < 0) findings.push('el pg_dump previo no se verifica (pg_restore --list)');
  if (migrate < 0) findings.push('falta paso explícito de migrate en deploy.yml');
  if (up < 0) findings.push('no se encontró el `compose up` (revisar el parser)');
  if (dump >= 0 && migrate >= 0 && dump > migrate) findings.push('pg_dump aparece DESPUÉS de migrate');
  if (migrate >= 0 && up >= 0 && migrate > up) findings.push('migrate aparece DESPUÉS de compose up');
  if (/migrate[^\n]*\|\|\s*(true|:)/.test(text)) findings.push('migrate neutralizado con `|| true`');
  if (migrate >= 0 && !/set\s+-[a-z]*e/.test(text)) findings.push('el script no usa `set -e` (migrate fallido no aborta)');
  return findings;
}

/** Divide un Dockerfile en etapas { name, text } por líneas FROM. */
export function dockerStages(dockerfile) {
  const parts = dockerfile.split(/^(?=FROM\s)/m).filter((p) => /^FROM\s/.test(p));
  return parts.map((text) => ({ name: (text.match(/^FROM\s+\S+(?:\s+AS\s+(\S+))?/i) ?? [])[1] ?? '', text }));
}

/**
 * La imagen que correrá el CMS (etapa final) o una etapa dedicada `*migrat*` debe poder ejecutar
 * `payload migrate`: necesita (1) el CLI de payload y sus dependencias (node_modules completo),
 * (2) la configuración y la carpeta de migraciones (apps/cms/src) porque `readMigrationFiles`
 * lee el DIRECTORIO en disco (payload/dist/database/migrations/readMigrationFiles.js) y
 * (3) un cargador de TypeScript si las migraciones son .ts. El standalone de Next NO trae nada de esto.
 */
export function migratorImageFindings(dockerfile) {
  const stages = dockerStages(dockerfile);
  if (stages.length === 0) return ['Dockerfile sin etapas FROM'];
  const final = stages[stages.length - 1];
  const candidates = [final, ...stages.filter((s) => /migrat/i.test(s.name) && s !== final)];
  const ok = candidates.some((s) => {
    const copies = [...s.text.matchAll(/^COPY[^\n]*$/gm)].map((m) => m[0]).join('\n');
    const hasCli = /node_modules/.test(copies);
    const hasMigrations = /apps\/cms\/src(\/migrations)?(\s|$)/.test(copies) || /migrations/.test(copies);
    return hasCli && hasMigrations;
  });
  return ok ? [] : [
    `ninguna etapa candidata (${candidates.map((c) => c.name || '(final)').join(', ')}) copia node_modules (CLI de payload) y apps/cms/src/migrations`,
  ];
}

// ---------------------------------------------------------------------------
// Pruebas de los propios chequeos (fixtures buena/mala): deben pasar siempre
// ---------------------------------------------------------------------------
describe('DEP-07 autoprueba de los chequeos (verde siempre)', () => {
  test('migrationDrift detecta huérfanos, faltantes y snapshot ausente', () => {
    const idx = "export const migrations = [{ up: a, down: b, name: '20260101_a' }]";
    assert.deepEqual(migrationDrift(idx, ['20260101_a.ts', '20260101_a.json', 'index.ts']), []);
    assert.equal(migrationDrift(idx, ['20260101_a.ts', '20260101_a.json', '20260202_b.ts', '20260202_b.json', 'index.ts']).length, 1);
    assert.equal(migrationDrift(idx, ['index.ts']).length, 1);
    assert.equal(migrationDrift(idx, ['20260101_a.ts', 'index.ts']).length, 1);
  });
  test('downHasEmptyDbGuard distingue down con y sin precondición', () => {
    const bad = 'export async function down({ db }) { await db.execute(sql`DROP TABLE "x" CASCADE;`) }';
    const good = 'export async function down({ db }) { const r = await db.execute(sql`SELECT count(*) FROM information_schema.tables`); if (n > 1) throw new Error("no vacía"); await db.execute(sql`DROP TABLE "x" CASCADE;`) }';
    assert.equal(downHasEmptyDbGuard(bad).ok, false);
    assert.equal(downHasEmptyDbGuard(good).ok, true);
  });
  test('deployOrderFindings acepta dump→migrate→up y rechaza orden/`|| true` inválidos', () => {
    const good = 'set -euo pipefail\npg_dump -Fc x > a\npg_restore --list a\ndocker compose run --rm cms payload migrate\ndocker compose up -d';
    assert.deepEqual(deployOrderFindings(good), []);
    assert.ok(deployOrderFindings(good.replace('payload migrate', 'payload migrate || true')).length > 0);
    assert.ok(deployOrderFindings('set -e\ndocker compose up -d\npayload migrate\npg_dump').length > 0);
    assert.ok(deployOrderFindings('# migrate pg_dump\ndocker compose up -d').length > 0);
  });
  test('migratorImageFindings acepta etapa con CLI+migraciones y rechaza solo-standalone', () => {
    const bad = 'FROM node AS runner\nCOPY --from=builder /app/apps/cms/.next/standalone ./\n';
    const good = 'FROM node AS runner\nCOPY --from=builder /app/node_modules ./node_modules\nCOPY --from=builder /app/apps/cms/src ./apps/cms/src\n';
    assert.ok(migratorImageFindings(bad).length > 0);
    assert.deepEqual(migratorImageFindings(good), []);
  });
});

// ---------------------------------------------------------------------------
// INVARIANTE (a): verde hoy. NO es RED porque hoy hay 1 migración y el índice coincide.
// Su valor es de regresión: reemplaza el `toContain` de payload-migrations-config.spec.ts (DEP-07 RED).
// ---------------------------------------------------------------------------
describe('DEP-07 (a) índice de migraciones vs directorio [invariante, verde hoy]', () => {
  test('index.ts, archivos .ts y snapshots .json coinciden', () => {
    const files = readdirSync(resolve(ROOT, MIGRATIONS_DIR));
    const findings = migrationDrift(read(`${MIGRATIONS_DIR}/index.ts`), files);
    assert.deepEqual(findings, [], `deriva de migraciones: ${findings.join('; ')}`);
  });
  test('hay al menos una migración (baseline) registrada', () => {
    assert.ok(indexNames(read(`${MIGRATIONS_DIR}/index.ts`)).length >= 1);
  });
});

// ---------------------------------------------------------------------------
// RED (b)(c)(d): DEBEN fallar hoy
// ---------------------------------------------------------------------------
describe('DEP-07 (b) RED: down del baseline solo sobre BD vacía', () => {
  test('el down del baseline tiene precondición de «BD vacía» antes del primer DROP', () => {
    const name = indexNames(read(`${MIGRATIONS_DIR}/index.ts`))[0];
    const { ok, reason } = downHasEmptyDbGuard(read(`${MIGRATIONS_DIR}/${name}.ts`));
    assert.equal(ok, true, `${name}.ts down: ${reason}`);
  });
});

describe('DEP-07 (c) RED: deploy con pg_dump verificado → migrate → up', () => {
  test('deploy.yml respeta el orden y aborta ante fallo', () => {
    const findings = deployOrderFindings(read('.github/workflows/deploy.yml'));
    assert.deepEqual(findings, [], findings.join('; '));
  });
});

describe('DEP-07 (d) RED: la imagen del CMS puede ejecutar el comando de migración', () => {
  test('apps/cms/Dockerfile: etapa final o *migrator* con CLI de payload y migraciones', () => {
    const findings = migratorImageFindings(read('apps/cms/Dockerfile'));
    assert.deepEqual(findings, [], findings.join('; '));
  });
});
