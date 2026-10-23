// DEP-10 — Pruebas ESTÁTICAS de variables de entorno alineadas (código, compose y .env.prod.example).
// Qué hace: lee (sin ejecutar nada) el compose de producción, el ejemplo de entorno, DEPLOY.md y las
//   fuentes de cada servicio, y exige: (1) cada variable que lee el código de un servicio llega a SU
//   `environment`; (2) nombres canónicos (SMTP_PASSWORD, SMTP_FROM_ADDRESS, S3_ENDPOINT, PORTAL_URL,
//   DATABASE_URI) y ningún nombre obsoleto; (3) el ejemplo no tiene secretos reales ni variables huérfanas;
//   (4) DEPLOY.md documenta cada variable del ejemplo.
// Por qué: AUDIT-DEPLOY-2026-10-19 («Env vars out of sync»): correo de contacto/recuperación sin credenciales,
//   revalidación ISR hacia localhost y secretos de preview/revalidación ausentes en el servicio que los lee.
// Límite: análisis textual; no ejecuta Compose, Docker ni SMTP. No prueba que los valores sean correctos.
// Spec: docs/specs/deploy/DEP-10-variables-de-entorno.md | RDD: RDD-DEP-32..RDD-DEP-37
//
// Ejecutar: node --test tests/deploy/dep10-env-vars.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectInputs, guardEnvParity, parseComposeEnvironments, ENV_IGNORED } from '../../harness/guards.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const COMPOSE = read('infrastructure/docker/compose.prod.yaml');
const EXAMPLE = read('infrastructure/docker/.env.prod.example');
const DEPLOY_MD = read('DEPLOY.md');
const { services, interpolated } = parseComposeEnvironments(COMPOSE);
const inputs = collectInputs();

/** Variables `process.env.X` que lee un conjunto de fuentes, sin comentarios de línea. */
function readVars(sources) {
  const out = new Map();
  for (const [file, text] of Object.entries(sources)) {
    for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) if (!out.has(m[1])) out.set(m[1], file);
  }
  return out;
}
const portalReads = readVars(inputs.env.portalSources);
const cmsReads = readVars(inputs.env.cmsSources);
const ignoredNames = new Set(ENV_IGNORED.map((e) => e.name));

/** Variables definidas en el ejemplo (líneas `NOMBRE=valor` no comentadas). */
function exampleEntries(text) {
  return text.split('\n')
    .map((l) => l.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
    .filter(Boolean)
    .map((m) => ({ name: m[1], value: m[2].trim() }));
}
const ENTRIES = exampleEntries(EXAMPLE);

describe('DEP-10 · variables que cada servicio recibe (RED: hoy faltan)', () => {
  test('el escaneo cubre portal y CMS con archivos clave de lib/, utilities/ y next.config', () => {
    const portalFiles = Object.keys(inputs.env.portalSources);
    const cmsFiles = Object.keys(inputs.env.cmsSources);
    for (const f of ['lib/cms/client.ts', 'lib/csp.ts', 'next.config.mjs', 'app/api/contact/route.ts']) {
      assert.ok(portalFiles.includes(f), `portal: el guard no escanea ${f}`);
    }
    for (const f of ['apps/cms/src/utilities/revalidation.ts', 'apps/cms/src/middleware.ts', 'apps/cms/src/payload.config.ts']) {
      assert.ok(cmsFiles.includes(f), `CMS: el guard no escanea ${f}`);
    }
    assert.ok(!cmsFiles.some((f) => f.includes('.backup.')), 'los archivos .backup no son código de runtime');
  });

  test('cada variable que lee el código del portal está en el environment del servicio portal', () => {
    const missing = [...portalReads.keys()].filter((v) => !ignoredNames.has(v) && !services.portal?.has(v));
    assert.deepEqual(missing, [], `portal no recibe: ${missing.join(', ')}`);
  });

  test('cada variable que lee el código del CMS está en el environment de cms y de cms-migrate', () => {
    for (const svc of ['cms', 'cms-migrate']) {
      const missing = [...cmsReads.keys()].filter((v) => !ignoredNames.has(v) && !services[svc]?.has(v));
      assert.deepEqual(missing, [], `${svc} no recibe: ${missing.join(', ')}`);
    }
  });

  test('el portal recibe SMTP_*, CONTACT_TO, CMS_URL y PREVIEW_SECRET', () => {
    for (const v of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_ADDRESS', 'CONTACT_TO', 'CMS_URL', 'PREVIEW_SECRET', 'REVALIDATION_SECRET']) {
      assert.ok(services.portal?.has(v), `portal sin ${v}`);
    }
  });

  test('el CMS recibe SMTP_*, POSTGRES_SSL, PORTAL_URL y REVALIDATION_SECRET', () => {
    for (const v of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_ADDRESS', 'SMTP_FROM_NAME', 'POSTGRES_SSL', 'PORTAL_URL', 'REVALIDATION_SECRET', 'PREVIEW_SECRET']) {
      assert.ok(services.cms?.has(v), `cms sin ${v}`);
    }
  });

  test('ningún servicio de la app recibe nombres obsoletos (SMTP_FROM, SMTP_PASS, DATABASE_URL, MINIO_ENDPOINT)', () => {
    for (const svc of ['cms', 'cms-migrate', 'portal']) {
      for (const old of ['SMTP_FROM', 'SMTP_PASS', 'DATABASE_URL', 'MINIO_ENDPOINT']) {
        assert.ok(!services[svc]?.has(old), `${svc} aún define ${old}`);
      }
    }
  });

  test('guard-env-parity sobre el repo real: sin hallazgos y sin variables ocultas en ENV_IGNORED', () => {
    const r = guardEnvParity(inputs.env);
    assert.deepEqual(r.findings, []);
  });
});

describe('DEP-10 · un solo nombre por concepto en el código (RED: hoy hay duplicados)', () => {
  const all = { ...inputs.env.portalSources, ...inputs.env.cmsSources };
  const readers = (name) => Object.entries(all).filter(([, t]) => new RegExp(`process\\.env\\.${name}\\b`).test(t)).map(([f]) => f);

  for (const old of ['SMTP_PASS', 'SMTP_FROM', 'DATABASE_URL', 'MINIO_ENDPOINT']) {
    test(`ningún código de runtime lee el nombre obsoleto ${old}`, () => {
      assert.deepEqual(readers(old), []);
    });
  }

  test('getDatabaseURL no conserva el fallback DATABASE_URL (lectura por alias env.X)', () => {
    const code = inputs.env.cmsSources['apps/cms/src/config/database.ts'].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/DATABASE_URL\b/.test(code), 'database.ts aún menciona DATABASE_URL');
  });

  test('el CMS no usa NEXT_PUBLIC_CMS_URL ni NEXT_PUBLIC_SITE_URL (nombres del portal)', () => {
    const cmsFiles = Object.entries(inputs.env.cmsSources);
    for (const name of ['NEXT_PUBLIC_CMS_URL', 'NEXT_PUBLIC_SITE_URL']) {
      const hit = cmsFiles.filter(([, t]) => new RegExp(`process\\.env\\.${name}\\b`).test(t)).map(([f]) => f);
      assert.deepEqual(hit, [], `${name} leída en el CMS`);
    }
  });

  test('las revalidaciones hacia el portal usan PORTAL_URL, no la URL del propio CMS', () => {
    // DEP-19b: la lectura de PORTAL_URL se centralizó en el helper común de revalidación; las
    // colecciones lo usan y ya no leen la URL del propio CMS.
    const helper = inputs.env.cmsSources['apps/cms/src/utilities/revalidation.ts'];
    assert.ok(helper, 'revalidation.ts no escaneado');
    assert.ok(/process\.env\.PORTAL_URL/.test(helper), 'revalidation.ts: debe usar PORTAL_URL');
    for (const f of ['TribunalMiembros', 'TribunalDocumentos', 'Convenios']) {
      const text = inputs.env.cmsSources[`apps/cms/src/collections/${f}.ts`];
      assert.ok(text, `${f}.ts no escaneado`);
      assert.ok(/utilities\/revalidation/.test(text), `${f}: debe usar el helper de revalidación`);
      assert.ok(!/process\.env\.NEXT_PUBLIC_SERVER_URL/.test(text), `${f}: NEXT_PUBLIC_SERVER_URL es la URL del CMS`);
    }
  });
});

describe('DEP-10 · .env.prod.example sin secretos reales ni huérfanas', () => {
  const SENSITIVE = /(SECRET|PASSWORD|TOKEN|ACCESS_KEY|SECRET_KEY|_KEY)$/;

  test('toda variable sensible usa un placeholder REEMPLAZAR_*', () => {
    const bad = ENTRIES.filter((e) => SENSITIVE.test(e.name) && !e.name.startsWith('NEXT_PUBLIC_') && !/^REEMPLAZAR_/.test(e.value));
    assert.deepEqual(bad.map((e) => e.name), []);
  });

  test('SMTP_USER/SMTP_PASSWORD, POSTGRES_PASSWORD y DATABASE_URI llevan placeholder', () => {
    const byName = Object.fromEntries(ENTRIES.map((e) => [e.name, e.value]));
    for (const n of ['SMTP_USER', 'SMTP_PASSWORD', 'POSTGRES_PASSWORD']) assert.match(byName[n] ?? '', /^REEMPLAZAR_/, n);
    assert.match(byName.DATABASE_URI ?? '', /REEMPLAZAR/, 'DATABASE_URI');
  });

  test('ningún valor tiene aspecto de credencial real', () => {
    const patterns = [
      [/AKIA[0-9A-Z]{16}/, 'access key de AWS'],
      [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada PEM'],
      [/\b(?:ghp|gho|github_pat|sk|xox[abp])[-_][A-Za-z0-9_-]{16,}/, 'token de proveedor'],
      [/^[A-Za-z0-9+/_-]{40,}={0,2}$/, 'cadena aleatoria larga'],
      [/\/\/[^/@\s:]+:(?!REEMPLAZAR)[^@\s]{3,}@/, 'URI con contraseña literal'],
    ];
    for (const e of ENTRIES) {
      for (const [re, what] of patterns) assert.ok(!re.test(e.value), `${e.name}: parece ${what}`);
    }
  });

  test('no hay variables huérfanas: cada una se interpola en el compose o es build-time leída por código', () => {
    const buildTime = new Set(ENV_IGNORED.filter((e) => e.example).map((e) => e.name));
    const allReads = new Set([...portalReads.keys(), ...cmsReads.keys()]);
    const orphans = ENTRIES.map((e) => e.name).filter((n) => !interpolated.has(n) && !(buildTime.has(n) && allReads.has(n)));
    assert.deepEqual(orphans, []);
  });

  test('toda ${VAR} del compose figura en el ejemplo (excepto IMAGE_TAG, que fija el pipeline)', () => {
    const names = new Set(ENTRIES.map((e) => e.name));
    const missing = [...interpolated].filter((v) => v !== 'IMAGE_TAG' && !names.has(v));
    assert.deepEqual(missing, []);
  });

  test('DATABASE_URI documenta percent-encoding y sincronía con POSTGRES_PASSWORD', () => {
    const idx = EXAMPLE.indexOf('DATABASE_URI=');
    assert.ok(idx > 0);
    const before = EXAMPLE.slice(Math.max(0, idx - 700), idx);
    assert.match(before, /percent|%[0-9A-F]{2}|codific/i, 'falta nota de percent-encoding');
    assert.match(before, /POSTGRES_PASSWORD/, 'falta nota de sincronía con POSTGRES_PASSWORD');
  });
});

describe('DEP-10 · DEPLOY.md documenta las variables por servicio', () => {
  test('cada variable del ejemplo aparece en DEPLOY.md', () => {
    const missing = ENTRIES.map((e) => e.name).filter((n) => !new RegExp(`\`${n}\``).test(DEPLOY_MD));
    assert.deepEqual(missing, []);
  });

  test('hay una sección de variables por servicio (portal, cms) y cómo generar secretos', () => {
    assert.match(DEPLOY_MD, /Variables por servicio/i);
    assert.match(DEPLOY_MD, /openssl rand/);
    assert.match(DEPLOY_MD, /portal/i);
    assert.match(DEPLOY_MD, /DEP-10/);
  });
});
