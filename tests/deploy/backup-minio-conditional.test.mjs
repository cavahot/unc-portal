// SEC-REVIEW: backup.sh no debe abortar cuando MinIO no está en marcha (perfil opcional; MEDIA_STORAGE=local
// por defecto). Qué hace: afirma estáticamente que el `docker exec unc-minio-local` solo se ejecuta dentro de
// una rama condicionada a MEDIA_STORAGE=s3 y que su fallo no aborta (`set -e`).
// Amenaza que evita: copia diaria que falla entera (sin BD ni media local) por un servicio opcional ausente.
// Límite: análisis estático del script; no ejecuta docker ni pg_dump.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(resolve(ROOT, 'scripts', 'backup', 'backup.sh'), 'utf8').replace(/\r\n/g, '\n');

test('el paso de MinIO está condicionado a MEDIA_STORAGE=s3 (por defecto local)', () => {
  assert.match(SRC, /MEDIA_STORAGE:-local/);
  const lines = SRC.split('\n');
  const execIdx = lines.findIndex((l) => l.includes('docker exec unc-minio-local'));
  assert.ok(execIdx > 0, 'debe existir el docker exec de MinIO');
  const guardIdx = lines.findIndex((l) => /if\s+\[\s+"\$\{?MEDIA_STORAGE/.test(l) && l.includes('s3'));
  assert.ok(guardIdx >= 0 && guardIdx < execIdx, 'el guard MEDIA_STORAGE=s3 debe preceder al docker exec');
});

test('el docker exec de MinIO no aborta el backup si falla', () => {
  const line = SRC.split('\n').find((l) => l.includes('docker exec unc-minio-local'));
  assert.match(line, /\|\|/);
});

test('database_version no usa el contenedor de MinIO', () => {
  const line = SRC.split('\n').find((l) => l.includes('database_version'));
  assert.ok(line && !line.includes('minio'));
});
