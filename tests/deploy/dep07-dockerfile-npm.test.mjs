// DEP-07 / D1 — Prueba estática: toda etapa del Dockerfile del CMS que ejecute `npm ci`/`npm install`
// debe haber instalado antes npm@11 (o partir de una base declarada compatible).
// Qué hace: lee apps/cms/Dockerfile (sin ejecutar Docker) y valida el orden de instrucciones por etapa.
// Por qué: node 22.17.0 trae npm 10.9.2 y con ese npm `npm ci` falla con «Missing: @swc/helpers@0.5.23
//   from lock file» (docs/evidence/dep-07-validation.md, D1); el lock se generó con npm más nuevo.
// Límite: análisis textual; no construye la imagen (la re-validación con docker build queda pendiente).
// Ejecutar: node --test tests/deploy/dep07-dockerfile-npm.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Combinaciones de imagen base con npm >= 11 de fábrica (no necesitan `npm i -g npm@11`). */
const NATIVE_NPM11_BASES = [/^node:24(\.|-|$)/];

/** Quita comentarios de línea completa para que un comentario no simule la instrucción. */
const stripComments = (t) => t.replace(/^\s*#.*$/gm, '');

/** Divide en etapas { name, from, body } por líneas FROM (el orden se conserva). */
export function stages(dockerfile) {
  const parts = stripComments(dockerfile.replace(/\\\r?\n\s*/g, ' ')).split(/^(?=FROM\s)/m).filter((p) => /^FROM\s/.test(p));
  return parts.map((body) => {
    const m = body.match(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/i);
    return { from: m[1], name: m[2] ?? '', body };
  });
}

/** ¿La etapa (o su ancestro por nombre) instala npm@11 antes de `npm ci`/`npm install`? */
export function npmFindings(dockerfile) {
  const all = stages(dockerfile);
  const findings = [];
  const globalNpm11 = /npm\s+(?:i|install)\s+(?:-g|--global)\s+npm@11\b/;
  const installs = /\bnpm\s+(?:ci|install|i)\b(?!\s+(?:-g|--global))/;
  const lineHasInstall = (l) => installs.test(l.replace(globalNpm11, ''));
  const chainHasNpm11 = (stage) => {
    for (let s = stage; s; s = all.find((x) => x.name && x.name === s.from)) {
      if (globalNpm11.test(s.body)) return true;
      if (NATIVE_NPM11_BASES.some((re) => re.test(s.from))) return true;
    }
    return false;
  };
  for (const st of all) {
    const runs = st.body.split('\n').filter((l) => /^RUN\s/.test(l));
    const idxInstall = runs.findIndex(lineHasInstall);
    if (idxInstall < 0) continue;
    const idxNpm11 = runs.findIndex((l) => globalNpm11.test(l));
    const sameLine = globalNpm11.test(runs[idxInstall]) && runs[idxInstall].search(globalNpm11) < runs[idxInstall].search(installs);
    const before = (idxNpm11 >= 0 && idxNpm11 < idxInstall) || sameLine;
    const ancestor = !before && chainHasNpm11({ ...st, body: '' }) ;
    if (!before && !ancestor) findings.push(`etapa «${st.name || st.from}» ejecuta npm ci/install sin instalar npm@11 antes (base ${st.from})`);
  }
  return findings;
}

describe('DEP-07/D1 autoprueba de npmFindings (fixtures)', () => {
  test('rechaza npm ci sin npm@11', () => {
    assert.equal(npmFindings('FROM node:22.17.0-alpine AS deps\nRUN npm ci\n').length, 1);
  });
  test('rechaza npm@11 DESPUÉS de npm ci', () => {
    assert.equal(npmFindings('FROM node:22.17.0-alpine AS deps\nRUN npm ci\nRUN npm i -g npm@11\n').length, 1);
  });
  test('acepta npm@11 antes (línea previa o misma línea) y base node:24', () => {
    assert.deepEqual(npmFindings('FROM node:22.17.0-alpine AS deps\nRUN npm i -g npm@11\nRUN npm ci\n'), []);
    assert.deepEqual(npmFindings('FROM node:22.17.0-alpine AS deps\nRUN npm i -g npm@11 && npm ci\n'), []);
    assert.deepEqual(npmFindings('FROM node:24-alpine AS deps\nRUN npm ci\n'), []);
  });
  test('un comentario no cuenta como instalación', () => {
    assert.equal(npmFindings('FROM node:22.17.0-alpine AS deps\n# RUN npm i -g npm@11\nRUN npm ci\n').length, 1);
  });
  test('no falla en etapas sin instalación de paquetes', () => {
    assert.deepEqual(npmFindings('FROM node:22.17.0-alpine AS runner\nRUN adduser x\n'), []);
  });
});

describe('DEP-07/D1 apps/cms/Dockerfile', () => {
  const dockerfile = readFileSync(resolve(ROOT, 'apps/cms/Dockerfile'), 'utf8');

  test('toda etapa con npm ci/install instala npm@11 antes', () => {
    const f = npmFindings(dockerfile);
    assert.deepEqual(f, [], f.join('; '));
  });
  test('hay al menos una etapa con npm ci (el chequeo no es vacuo)', () => {
    assert.ok(stages(dockerfile).some((s) => /\bnpm\s+ci\b/.test(s.body)));
  });
  test('la versión mayor está fijada (npm@11, no latest) y justificada en un comentario', () => {
    assert.doesNotMatch(stripComments(dockerfile), /npm@latest/);
    assert.match(dockerfile, /^\s*#.*latest.*$/mi, 'falta el comentario que explica por qué no se usa latest');
  });
  test('la imagen base de Node no cambia (22.17.0-alpine)', () => {
    assert.match(dockerfile, /^FROM node:22\.17\.0-alpine AS base$/m);
  });
});
