// DOMINIOS-SSL-01 — Portal en www.unc.edu.py (cert Sectigo único), CMS en cms.unc.edu.py (Let's Encrypt),
//   media pública bajo rutas del host www; el host files.unc.edu.py desaparece.
// Qué hace: lectura ESTÁTICA (sin ejecutar nginx ni Docker) de nginx.conf, su plantilla de la ruta S3,
//   compose.prod.yaml, .env.prod.example, deploy.yml y rename-certs.sh, y exige el contrato de la spec.
// Por qué: el VPS solo tiene un certificado comercial válido para www.unc.edu.py; sin esta configuración
//   nginx no arranca (faltan certs) o expone rutas del CMS en el host público del portal.
// Límite: no prueba nginx real (eso es `nginx -t` aparte) ni el hairpin; solo el texto de los archivos.
// Spec: docs/specs/infra/DOMINIOS-SSL-01.md
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const strip = (t) => t.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');

const RAW = read('infrastructure/nginx/nginx.conf');
const CONF = strip(RAW);
const TPL_PATH = 'infrastructure/nginx/templates/archivos-s3.location.template';
const TPL = existsSync(resolve(ROOT, TPL_PATH)) ? strip(read(TPL_PATH)) : '';
const COMPOSE = read('infrastructure/docker/compose.prod.yaml');
const EXAMPLE = read('infrastructure/docker/.env.prod.example');
const DEPLOY_YML = read('.github/workflows/deploy.yml');
const RENAME = read('scripts/setup/rename-certs.sh');

/** Cuerpo del bloque cuyo encabezado casa con headerRe (llaves balanceadas). */
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
const http = block(CONF, /\bhttp\s*\{/);
function serverFor(name) {
  for (let from = 0; ;) {
    const b = block(http.body, /\bserver\s*\{/, from);
    if (!b) return null;
    if (new RegExp(`server_name\\s+${name.replace(/\./g, '\\.')}\\s*;`).test(b.body)) return b.body;
    from = b.end;
  }
}
const WWW = serverFor('www.unc.edu.py');
const CMS = serverFor('cms.unc.edu.py');
const loc = (server, re) => block(server, re)?.body ?? null;
const MEDIA = loc(WWW ?? '', /location\s+\^~\s+\/api\/media\/file\/\s*\{/);

describe('DOMINIOS-SSL-01 · hosts y certificados', () => {
  test('ningún archivo de config menciona portal.unc.edu.py ni files.unc.edu.py (ni sus certs)', () => {
    for (const [name, text] of Object.entries({ nginx: RAW, compose: COMPOSE, example: EXAMPLE, deploy: DEPLOY_YML, rename: RENAME, tpl: TPL })) {
      assert.doesNotMatch(text, /portal\.unc\.edu\.py|files\.unc\.edu\.py|portal_(fullchain|privkey)|files_(fullchain|privkey)/, `${name} aún nombra un host o cert retirado`);
    }
  });

  test('el server www usa www_fullchain.pem / www_privkey.pem y el de cms usa cms_*', () => {
    assert.ok(WWW, 'falta el server de www.unc.edu.py');
    assert.match(WWW, /ssl_certificate\s+\/etc\/nginx\/certs\/www_fullchain\.pem;/);
    assert.match(WWW, /ssl_certificate_key\s+\/etc\/nginx\/certs\/www_privkey\.pem;/);
    assert.match(CMS, /ssl_certificate\s+\/etc\/nginx\/certs\/cms_fullchain\.pem;/);
    assert.match(CMS, /ssl_certificate_key\s+\/etc\/nginx\/certs\/cms_privkey\.pem;/);
  });

  test('solo hay tres server blocks (80, www, cms) y el :80 atiende www y cms con ACME + 301', () => {
    let n = 0;
    for (let from = 0, b; (b = block(http.body, /\bserver\s*\{/, from)); from = b.end) n++;
    assert.equal(n, 3);
    const s80 = http.body.match(/server\s*\{[^}]*listen\s+80;[\s\S]*?\n    \}/)[0];
    assert.match(s80, /server_name\s+www\.unc\.edu\.py\s+cms\.unc\.edu\.py\s*;/);
    assert.match(s80, /location\s+\/\.well-known\/acme-challenge\/\s*\{[^}]*root\s+\/var\/www\/certbot;/);
    assert.match(s80, /return\s+301\s+https:\/\/\$host\$request_uri;/);
  });

  test('la raíz del webroot ACME está montada en el contenedor nginx (si no, certbot --webroot no sirve)', () => {
    const nginx = COMPOSE.slice(COMPOSE.indexOf('\n  nginx:'));
    assert.match(nginx, /-\s*\/var\/www\/certbot:\/var\/www\/certbot:ro/);
  });
});

describe('DOMINIOS-SSL-01 · ruta de media pública en el host www', () => {
  test('existe `^~ /api/media/file/` y apunta a cms_upstream', () => {
    assert.ok(MEDIA, 'falta la location de media en www');
    assert.match(MEDIA, /proxy_pass\s+http:\/\/cms_upstream;/);
  });

  test('solo GET/HEAD, sin cookies ni Authorization hacia el CMS y sin Set-Cookie de vuelta', () => {
    assert.match(MEDIA, /limit_except\s+GET\s+HEAD\s*\{\s*deny\s+all;\s*\}/);
    assert.match(MEDIA, /proxy_set_header\s+Cookie\s+"";/);
    assert.match(MEDIA, /proxy_set_header\s+Authorization\s+"";/);
    assert.match(MEDIA, /proxy_hide_header\s+Set-Cookie;/);
  });

  test('repite HSTS y nosniff, no pisa Cache-Control ni la CSP del CMS', () => {
    assert.match(MEDIA, /add_header\s+Strict-Transport-Security\s+"[^"]+"\s+always;/);
    assert.match(MEDIA, /add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/);
    assert.doesNotMatch(MEDIA, /add_header\s+Cache-Control|add_header\s+Content-Security-Policy|proxy_hide_header\s+(Cache-Control|Content-Security-Policy)/i);
  });

  test('ninguna otra ruta del CMS se proxifica en www: solo cms_upstream dentro de /api/media/file/', () => {
    const rest = WWW.replace(MEDIA, '');
    assert.doesNotMatch(rest, /cms_upstream/);
    assert.doesNotMatch(WWW, /location\s+[^{]*\/api\/(users|media\/?\s|graphql|globals|access)/);
  });

  test('la zona de tasa y la regla POST /api/media siguen SOLO en el host cms', () => {
    assert.match(CMS, /location\s+~\s+\^\/api\/media\/\?\$\s*\{[\s\S]*limit_req\s+zone=cms_media/);
    assert.doesNotMatch(WWW, /limit_req/);
  });
});

describe('DOMINIOS-SSL-01 · ruta /archivos/ hacia S3 (opcional)', () => {
  test('nginx.conf incluye las rutas generadas dentro del server www', () => {
    assert.match(WWW, /include\s+\/etc\/nginx\/conf\.d\/\*\.location;/);
    assert.match(WWW, /resolver\s+127\.0\.0\.11\b/);
  });

  test('la plantilla define `^~ /archivos/`: GET/HEAD, DNS por petición, reescritura al bucket, sin listado', () => {
    assert.ok(TPL, `falta ${TPL_PATH}`);
    assert.match(TPL, /location\s+\^~\s+\/archivos\/\s*\{/);
    assert.match(TPL, /limit_except\s+GET\s+HEAD\s*\{\s*deny\s+all;\s*\}/);
    assert.match(TPL, /set\s+\$s3_backend\s+unc-s3-prod:8333;/);
    assert.match(TPL, /proxy_pass\s+http:\/\/\$s3_backend;/);
    assert.match(TPL, /rewrite\s+\^\/archivos\/\(\.\+\)\$\s+\/\$\{S3_BUCKET\}\/\$1\s+break;/);
    assert.match(TPL, /location\s+=\s+\/archivos\/\s*\{\s*return\s+404;\s*\}/);
    assert.match(TPL, /proxy_set_header\s+Cookie\s+"";/);
    assert.match(TPL, /proxy_set_header\s+Authorization\s+"";/);
    assert.match(TPL, /add_header\s+Strict-Transport-Security\s+"[^"]+"\s+always;/);
    assert.match(TPL, /add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/);
  });

  test('nginx.conf no tiene upstream estático a s3 y compose renderiza la plantilla con S3_BUCKET', () => {
    assert.doesNotMatch(CONF, /server\s+(s3|unc-s3-prod):\d+/);
    const nginx = COMPOSE.slice(COMPOSE.indexOf('\n  nginx:'));
    assert.match(nginx, /S3_BUCKET:\s+\$\{S3_BUCKET:-unc-media\}/);
    assert.match(nginx, /NGINX_ENVSUBST_FILTER:\s+\^S3_BUCKET\$\$/);
    assert.match(nginx, /\.\.\/nginx\/templates:\/etc\/nginx\/templates:ro/);
  });
});

describe('DOMINIOS-SSL-01 · compose y variables de entorno', () => {
  test('el portal recibe NEXT_PUBLIC_CMS_URL desde MEDIA_PUBLIC_ORIGIN (obligatoria) y SITE_URL desde PORTAL_PUBLIC_URL', () => {
    const portal = COMPOSE.slice(COMPOSE.indexOf('\n  portal:'), COMPOSE.indexOf('\n  nginx:'));
    assert.match(portal, /NEXT_PUBLIC_CMS_URL:\s+\$\{MEDIA_PUBLIC_ORIGIN:\?[^}]+\}/);
    assert.match(portal, /NEXT_PUBLIC_SITE_URL:\s+\$\{PORTAL_PUBLIC_URL\}/);
    assert.doesNotMatch(portal, /CMS_PUBLIC_URL/);
  });

  test('CMS_PUBLIC_URL solo alimenta al CMS (NEXT_PUBLIC_SERVER_URL)', () => {
    const uses = [...COMPOSE.matchAll(/^\s*([A-Z_]+):\s+\$\{CMS_PUBLIC_URL\}/gm)].map((m) => m[1]);
    assert.deepEqual(uses, ['NEXT_PUBLIC_SERVER_URL']);
  });

  test('.env.prod.example define los nombres nuevos con los valores del contrato', () => {
    const v = (n) => EXAMPLE.match(new RegExp(`^${n}=(.*)$`, 'm'))?.[1].trim();
    assert.equal(v('PORTAL_PUBLIC_URL'), 'https://www.unc.edu.py');
    assert.equal(v('CMS_PUBLIC_URL'), 'https://cms.unc.edu.py');
    assert.equal(v('MEDIA_PUBLIC_ORIGIN'), 'https://www.unc.edu.py');
    assert.equal(v('MEDIA_HOSTNAME'), 'www.unc.edu.py');
    assert.equal(v('S3_PUBLIC_URL'), 'https://www.unc.edu.py/archivos');
  });
});

describe('DOMINIOS-SSL-01 · deploy.yml y rename-certs.sh', () => {
  test('health y warm-up usan www.unc.edu.py (y el CMS sigue en cms.unc.edu.py)', () => {
    assert.match(DEPLOY_YML, /https:\/\/www\.unc\.edu\.py\/api\/health/);
    assert.match(DEPLOY_YML, /BASE="https:\/\/www\.unc\.edu\.py"/);
    assert.match(DEPLOY_YML, /https:\/\/cms\.unc\.edu\.py\/api\/health/);
  });

  test('rename-certs.sh mapea www y cms; www (Sectigo) admite cert manual ya copiado', () => {
    assert.match(RENAME, /\["www\.unc\.edu\.py"\]="www"/);
    assert.match(RENAME, /\["cms\.unc\.edu\.py"\]="cms"/);
    assert.match(RENAME, /Sectigo/);
    assert.match(RENAME, /\$\{name\}_fullchain\.pem/);
    assert.doesNotMatch(RENAME, /\["(portal|files)\./);
  });
});
