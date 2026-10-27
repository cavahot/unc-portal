// VERIF-DOCKER-01 / VERIF-DOCKER-02 — Pruebas estáticas de la imagen del CMS (apps/cms/Dockerfile + .dockerignore).
// Qué hace: lee los archivos (sin ejecutar Docker) y comprueba dos defectos hallados al construir y
//   arrancar la imagen real el 2026-10-23 (docs/specs/migration/VERIFICACION-ENTORNO-DOCKER-2026-10-23.md).
// Por qué existe:
//   (1) Con `outputFileTracingRoot` = raíz del monorepo, Next genera el standalone con la estructura del
//       monorepo: el servidor queda en `apps/cms/server.js` y los estáticos se sirven desde
//       `apps/cms/.next/static`. `CMD ["node","server.js"]` en /app daba MODULE_NOT_FOUND (el CMS no arrancaba).
//   (3) `next build` del CMS importa payload.config.ts, que exige DATABASE_URI (config/database.ts). En CI no hay
//       apps/cms/.env, así que `RUN npm run build:cms` fallaba; solo pasaba en máquinas con ese .env filtrado.
//   (3) `next build` del CMS importa payload.config.ts, que exige DATABASE_URI (config/database.ts); en CI no hay
//       apps/cms/.env, así que `RUN npm run build:cms` fallaba (solo pasaba con ese .env filtrado a la imagen).
//   (2) `.dockerignore` solo excluía `.env` en la RAÍZ; `apps/cms/.env` (secretos de desarrollo) entraba al
//       contexto y quedaba dentro de la imagen del CMS. Amenaza: secretos en capas de imagen locales.
// Límite: análisis textual; la prueba de fuego es construir y arrancar la imagen (ver el informe).
// Ejecutar: node --test tests/deploy/docker-cms-image.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const noComments = (t) => t.replace(/^\s*#.*$/gm, '');

/** Cuerpo de la etapa final `runner` del Dockerfile del CMS, sin comentarios. */
function runnerStage() {
  const parts = noComments(read('apps/cms/Dockerfile')).split(/^(?=FROM\s)/m);
  const runner = parts.find((p) => /^FROM\s+\S+\s+AS\s+runner\b/i.test(p));
  assert.ok(runner, 'no se encontró la etapa runner');
  return runner;
}

describe('VERIF-DOCKER-01: arranque del standalone del CMS', () => {
  const usesMonorepoTraceRoot = /outputFileTracingRoot\s*:\s*monorepoRoot/.test(read('apps/cms/next.config.mjs'));

  test('el CMD apunta al server.js anidado cuando outputFileTracingRoot es la raíz del monorepo', () => {
    assert.ok(usesMonorepoTraceRoot, 'supuesto: next.config.mjs fija outputFileTracingRoot a la raíz del monorepo');
    assert.match(runnerStage(), /CMD\s*\["node",\s*"apps\/cms\/server\.js"\]/);
  });

  test('los estáticos se copian junto al server.js anidado (apps/cms/.next/static)', () => {
    assert.match(runnerStage(), /\.next\/static\s+\.\/apps\/cms\/\.next\/static/);
  });
});

describe('VERIF-DOCKER-02: .dockerignore no deja pasar .env de subdirectorios', () => {
  const lines = read('.dockerignore').split(/\r?\n/).map((l) => l.trim());

  test('excluye **/.env y **/.env.* en cualquier profundidad', () => {
    assert.ok(lines.includes('**/.env'), 'falta **/.env');
    assert.ok(lines.includes('**/.env.*'), 'falta **/.env.*');
  });

  test('conserva la excepción para los .env.example', () => {
    assert.ok(lines.includes('!**/.env.example'), 'falta !**/.env.example');
  });
});

describe('VERIF-DOCKER-03: build del CMS sin depender de un .env local', () => {
  /** Cuerpo de la etapa `builder` sin comentarios (líneas continuadas unidas). */
  const builder = () => {
    // Une las líneas continuadas con barra invertida (también con fin de línea CRLF).
    const bs = String.fromCharCode(92);
    const src = noComments(read('apps/cms/Dockerfile')).split(bs + String.fromCharCode(13, 10)).join(' ').split(bs + String.fromCharCode(10)).join(' ');
    const stage = src.split(/^(?=FROM\s)/m).find((p) => /^FROM\s+\S+\s+AS\s+builder\b/i.test(p));
    assert.ok(stage, 'no se encontró la etapa builder');
    return stage;
  };

  test('RUN npm run build:cms recibe un DATABASE_URI postgres de relleno solo para ese comando', () => {
    assert.match(builder(), /RUN\s+DATABASE_URI=postgresql:\/\/\S+\s+npm run build:cms/);
  });

  test('el relleno no se persiste como ENV/ARG (no llega al entorno de ejecución)', () => {
    assert.doesNotMatch(builder(), /^\s*(ENV|ARG)\s+DATABASE_URI/m);
  });
});

describe('VERIF-DOCKER-04: sondas de salud por 127.0.0.1, no por localhost', () => {
  // Por qué: el standalone de Next escucha en HOSTNAME=0.0.0.0 (solo IPv4). En alpine, `localhost` resuelve
  // primero a ::1 y el `wget` de busybox no reintenta con 127.0.0.1: «Connection refused» aunque el servidor
  // esté listo (medido el 2026-10-23: 127.0.0.1 -> 200, localhost -> refused). Resultado: el contenedor quedaba
  // `unhealthy`, `depends_on: service_healthy` bloqueaba portal/nginx y el gate de deploy.yml revertía siempre.
  // Amenaza que evita: despliegue que nunca llega a «healthy». Límite: textual; depende de que la app siga en 0.0.0.0.
  const targets = [
    ['infrastructure/docker/compose.prod.yaml', 'healthcheck de compose'],
    ['.github/workflows/deploy.yml', 'gate de readiness de deploy.yml'],
  ];
  for (const [file, label] of targets) {
    test(`${label}: ninguna sonda wget usa localhost`, () => {
      const probes = noComments(read(file)).split(/\r?\n/).filter((l) => /wget\b.*\/api\/health/.test(l));
      assert.ok(probes.length >= 2, 'se esperaban las sondas de cms y portal');
      for (const l of probes) {
        assert.doesNotMatch(l, /localhost/);
        assert.match(l, /127\.0\.0\.1:3000\/api\/health/);
      }
    });
  }
});

describe('VERIF-DOCKER-05: libvips de sharp presente en las imágenes runner', () => {
  // Por qué: el tracer de Next (nft) copia a standalone el .node de sharp pero NO la librería compartida
  // `libvips-cpp.so.*` (se carga con dlopen). Medido el 2026-10-23 con la imagen real del CMS:
  // «ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: No such file» -> `import sharp` en payload.config.ts falla y TODA
  // ruta de Payload responde 500 (login, media, /api/health). Mismo faltante en la imagen del portal (optimizador
  // de imágenes de Next). Amenaza que evita: despliegue con CMS inservible. Límite: textual y solo musl/x64.
  const LIBVIPS = '@img/sharp-libvips-linuxmusl-x64';
  for (const file of ['apps/cms/Dockerfile', 'Dockerfile']) {
    test(`${file}: la etapa runner copia ${LIBVIPS} desde deps`, () => {
      const parts = noComments(read(file)).split(/^(?=FROM\s)/m);
      const runner = parts.find((p) => /^FROM\s+\S+\s+AS\s+runner\b/i.test(p));
      assert.ok(runner, 'no se encontró la etapa runner');
      const copies = runner.split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l.startsWith('COPY ') && l.includes('--from=deps'));
      assert.ok(
        copies.some((l) => l.includes('/app/node_modules/' + LIBVIPS) && l.includes('./node_modules/' + LIBVIPS)),
        'falta COPY --from=deps del paquete libvips',
      );
    });
  }
});
