// NGX-01 — Límites de subida y de tasa del nginx del CMS (MIG-IMG §16.3) + ruta /archivos/ de S3 (SeaweedFS) perezosa.
// Qué hace: parsea el TEXTO de infrastructure/nginx/nginx.conf (llaves balanceadas, sin ejecutar nginx) y
//   exige: (1) client_max_body_size del CMS = 12m (>= proxyClientMaxBodySize de Next y > techo de 11 MiB
//   de media, para que el usuario vea primero el 413 limpio de la app); (2) limit_req_zone declarada en el
//   contexto http, con clave vacía para métodos distintos de POST, y referenciada solo por
//   `POST /api/media`; (3) esa location conserva las directivas de proxy de la genérica; (4) no hay un
//   `upstream` estático hacia s3 (nginx no arrancaría sin el contenedor al ser el almacén opcional).
// Por qué: con 100m un archivo enorme consumía ancho de banda antes de ser rechazado; sin límite de tasa
//   un editor comprometido podía llenar el volumen de media. Límite: no prueba nginx real (nginx -t y
//   curl requieren Docker, que este paso no ejecuta); la tasa es por IP, no por usuario.
// Tarea: NGX-01 | Spec: docs/specs/migration/MIG-IMG-imagenes-de-noticias.md §16.3
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = readFileSync(resolve(ROOT, 'infrastructure', 'nginx', 'nginx.conf'), 'utf8').replace(/\r\n/g, '\n');
const CONF = RAW.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
const NEXT = readFileSync(resolve(ROOT, 'apps', 'cms', 'next.config.mjs'), 'utf8');

/** Devuelve el cuerpo del bloque que empieza en `header` (texto antes de «{»), con llaves balanceadas. */
function block(text, headerRe, from = 0) {
  const m = text.slice(from).match(headerRe);
  if (!m) return null;
  const open = from + m.index + m[0].length - 1;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { body: text.slice(open + 1, i), start: from + m.index, end: i + 1 };
  }
  return null;
}
const mb = (v) => Number(String(v).match(/^(\d+)/)[1]) * (/g/i.test(v) ? 1024 : 1); // en MiB, suficiente aquí

const http = block(CONF, /\bhttp\s*\{/);

/** Servidor cms: localiza el bloque `server` que contiene server_name cms.unc.edu.py. */
function cmsServer() {
  let from = 0;
  for (;;) {
    const b = block(http.body, /\bserver\s*\{/, from);
    if (!b) return null;
    if (/server_name\s+cms\.unc\.edu\.py\s*;/.test(b.body)) return b.body;
    from = b.end;
  }
}
const CMS = cmsServer();
const locationBody = (server, re) => block(server, re)?.body ?? null;
const proxyHeaders = (body) => [...body.matchAll(/proxy_set_header\s+(\S+)\s+([^;]+);/g)].map((m) => `${m[1]} ${m[2].trim()}`).sort();

test('(1) servidor cms encontrado y client_max_body_size = 12m (ya no 100m)', () => {
  assert.ok(CMS, 'no se halló el server de cms.unc.edu.py');
  const sizes = [...CMS.matchAll(/client_max_body_size\s+(\S+);/g)].map((m) => m[1]);
  assert.deepEqual(sizes, ['12m']);
});

test('(2) orden de límites: nginx >= proxyClientMaxBodySize de Next >= techo de media (11 MiB)', () => {
  const next = NEXT.match(/proxyClientMaxBodySize:\s*'(\d+)mb'/);
  assert.ok(next, 'next.config.mjs debe seguir fijando proxyClientMaxBodySize');
  const ngx = mb(CMS.match(/client_max_body_size\s+(\S+);/)[1]);
  assert.ok(ngx >= Number(next[1]), `nginx (${ngx}m) debe ser >= Next (${next[1]}mb) para que responda primero la app`);
  assert.ok(ngx >= 12 && Number(next[1]) >= 12, 'el techo de media (11 MiB) + multipart debe caber');
});

test('(3) limit_req_zone cms_media en contexto http, fuera de todo server, con clave vacía salvo POST', () => {
  // Texto del contexto http sin los bloques server (se recortan con llaves balanceadas).
  let outside = http.body;
  for (let b = block(outside, /\bserver\s*\{/); b; b = block(outside, /\bserver\s*\{/)) outside = outside.slice(0, b.start) + outside.slice(b.end);
  assert.match(outside, /limit_req_zone\s+\$media_write_key\s+zone=cms_media:\d+m\s+rate=10r\/m;/);
  const map = block(http.body, /map\s+\$request_method\s+\$media_write_key\s*\{/);
  assert.ok(map, 'falta el map que deja la clave vacía para métodos distintos de POST');
  assert.match(map.body, /default\s+"";/);
  assert.match(map.body, /POST\s+\$binary_remote_addr;/);
});

test('(4) location de POST /api/media: limit_req burst=5 nodelay, 429 y mismo proxy que la genérica', () => {
  const media = locationBody(CMS, /location\s+~\s+\^\/api\/media\/\?\$\s*\{/);
  assert.ok(media, 'falta la location exacta de /api/media');
  assert.match(media, /limit_req\s+zone=cms_media\s+burst=5\s+nodelay;/);
  assert.match(media, /limit_req_status\s+429;/);
  assert.match(media, /proxy_pass\s+http:\/\/cms_upstream;/);
  const generic = locationBody(CMS, /location\s+\/\s*\{/);
  for (const h of proxyHeaders(generic)) assert.ok(proxyHeaders(media).includes(h), `falta ${h} en /api/media`);
  for (const d of ['proxy_http_version 1.1', 'proxy_read_timeout', 'proxy_send_timeout', 'proxy_connect_timeout']) {
    assert.ok(media.includes(d), `falta ${d} en /api/media`);
  }
  // No debe subir el tope de cuerpo por su cuenta: hereda el del server.
  assert.doesNotMatch(media, /client_max_body_size/);
});

test('(5) la zona cms_media solo se usa en /api/media; el login conserva cms_login', () => {
  const uses = [...CONF.matchAll(/limit_req\s+zone=(\w+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(uses, ['cms_login', 'cms_media']);
  assert.match(locationBody(CMS, /location\s+\/api\/users\/login\s*\{/), /limit_req\s+zone=cms_login\s+burst=3\s+nodelay;/);
});

// DOMINIOS-SSL-01: la ruta pública de S3 ya no es un host propio sino `/archivos/` del host www, generada desde
// infrastructure/nginx/templates/archivos-s3.location.template (la cubre dominios-ssl-01.test.mjs en detalle).
const TPL = readFileSync(resolve(ROOT, 'infrastructure', 'nginx', 'templates', 'archivos-s3.location.template'), 'utf8')
  .replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');

test('(6) S3 opcional: sin `upstream` estático a s3; /archivos/ resuelve en tiempo de petición', () => {
  assert.doesNotMatch(CONF, /server\s+(s3|unc-s3-prod|minio):\d+/, 'un upstream estático impide arrancar nginx si el contenedor s3 no existe');
  assert.match(CONF, /resolver\s+127\.0\.0\.11\b/);
  assert.match(TPL, /set\s+\$s3_backend\s+unc-s3-prod:8333;/);
  assert.match(TPL, /proxy_pass\s+http:\/\/\$s3_backend;/);
});

// S3-SEAWEEDFS-01: la ruta pública de archivos solo sirve GET/HEAD y conserva las cabeceras de seguridad
// (SeaweedFS no las añade; un add_header en el location anula los del server, por eso se repiten allí).
test('(7) /archivos/: limit_except GET HEAD con deny all y cabeceras de seguridad en el location', () => {
  assert.match(TPL, /limit_except\s+GET\s+HEAD\s*\{\s*deny\s+all;\s*\}/);
  assert.match(TPL, /add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/);
  assert.match(TPL, /add_header\s+Strict-Transport-Security\s+"[^"]+"\s+always;/);
  assert.doesNotMatch(CONF + TPL, /minio/i);
});
