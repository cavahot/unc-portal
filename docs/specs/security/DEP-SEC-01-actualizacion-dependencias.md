# DEP-SEC-01 — Actualización controlada de dependencias de producción vulnerables

**Estado:** aplicado en local, verificado, sin commit; migración de despliegue escrita y probada en BD sintética (§5). **Ámbito:** `package.json`, `apps/cms/package.json`, `package-lock.json`.
**Fuera de alcance:** `npm audit fix` / `--force`, cambios de imagen Docker o de `compose.prod.yaml`, generación de
migraciones de base de datos, despliegue.

## 1. Problema (SDD)

`npm audit --omit=dev` (26-10-2026, línea base) reporta **28 vulnerabilidades: 3 críticas, 13 altas, 12 moderadas** en
dependencias que llegan a producción (portal Next.js y CMS Payload).

### Criterios Given/When/Then

- **Given** los manifiestos y el lockfile, **when** corre `tests/unit/dependency-versions.spec.ts`, **then** toda copia de
  `payload`, `@payloadcms/storage-s3`, `next`, `@sentry/nextjs`, `sharp`, `nodemailer` y `zod` es ≥ al mínimo que cierra los
  advisories, y todos los `@payloadcms/*` + `payload` comparten exactamente la misma versión.
- **Given** la actualización aplicada, **when** se corre `npm audit --omit=dev --json`, **then** no quedan advisories directos
  de esos paquetes; los remanentes quedan listados con causa (transitivo / bloqueado upstream / solo herramienta de desarrollo).
- **Given** la actualización aplicada, **then** siguen verdes: vitest, typecheck del portal, `tsc` del CMS, pruebas de deploy y
  arnés `--quick` (salvo `guard-deploy-steps`, rojo previo conocido por `minio:latest`).
- **Negativo:** **given** un rollback parcial (p. ej. `next` vuelve a 16.2.x), **then** la guardia falla.

## 2. Evidencia RDD (línea base, hecho observado)

Salida completa: `npm audit --omit=dev --json` (no versionada; resumen abajo). Versiones instaladas en la línea base:
payload y `@payloadcms/*` 3.87.1, next 16.2.12, @sentry/nextjs 10.69.0, sharp 0.35.3, nodemailer 9.0.3, zod 3.25.76.

| Paquete | Sev. máx. | Advisories (ejemplos) | Mínimo que corrige |
|---|---|---|---|
| payload (+ drizzle, graphql, next, ui, plugin-cloud-storage, email-nodemailer, db-postgres) | crítica | GHSA-v49j-62m6-pgrr (SQLi Postgres, <3.88.0), GHSA-vc4h-q48j-5hcx (bypass de acceso a campos en colecciones auth, <3.90.0), GHSA-f7hx-52q9-hcrf (update no autorizado, <3.90.0), GHSA-97rh-rhh2-7vjv (RCE vía first-register, <3.90.0), GHSA-66wr-7vmr-p5jq, GHSA-238x-w2j9-gwwr, GHSA-2pwp-2369-8fg3 (SVG), GHSA-9qpg-3cf8-w33x (XML) y otros | 3.90.0 (npm: 3.91.0) |
| @payloadcms/storage-s3 | alta | GHSA-7vg8-29qx-jgj8 (client uploads sobrescriben objetos S3, <3.90.0) | 3.90.0 |
| @payloadcms/richtext-lexical → @lexical/headless → happy-dom | alta | GHSA-834v-8h66-3h79 (happy-dom ≤21.0.3) | 3.91.0 |
| next | crítica | GHSA-2464-fhr4-w9xw y GHSA-673q-mjm6-r5xr (RCE, ≤16.4.0), GHSA-2xp9-vwfh-vxw4 / GHSA-p293-qw3h-jr36 (RCE, <16.3.3), GHSA-vcvr-r3jv-pc5j (RCE next/og, <16.3.6), GHSA-cjq9-62q9-8jv4 (SSRF optimizador de imágenes), GHSA-p3m5-59mp-jv5r (DoS server actions) | 16.4.3 (npm) |
| @sentry/nextjs | crítica | GHSA-mchm-gjx6-7h55 (bypass de middleware con tunnel route, <10.75.2) | 10.75.2 |
| sharp | alta | GHSA-rgj7-g3m4-5g8c (libheif, <0.35.4), GHSA-wq5f-xc86-pv6w (librsvg, <0.35.5) | 0.35.5 |
| nodemailer | alta | GHSA-2x7j-588g-ccc2, GHSA-v53p-9fqp-m79j (addressparser cuadrático), GHSA-8c8m-p3m8-cjg8 / -m943- / -85x2- (<10.1.4) y otros | 10.1.4 |
| zod | alta | GHSA-mrhx-c7xc-m3w5 (agotamiento de memoria con colecciones grandes, <4.6.6) | 4.6.6 (npm: 4.6.7, major) |
| undici (transitivo de payload, fijado 7.29.1) | alta | GHSA-xjj6-f33q-929c, GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472 (<7.30.1) | 7.30.1 |
| fast-uri, js-yaml, brace-expansion, nanoid, source-map-js, fast-copy | alta/moderada | transitivos; el repo ya tiene `overrides` para varios con pisos anteriores al fix | ver §3 |
| esbuild ≤0.24.2 ← @esbuild-kit ← drizzle-kit 0.31.7 ← @payloadcms/db-postgres | moderada | GHSA-67mh-4wv8-2f99 (servidor de desarrollo de esbuild) | sin fix upstream (3.92.0 sigue con drizzle-kit 0.31.7) |

Fuentes de método: notas de versión oficiales de Payload v3.88.0–v3.91.0 (GitHub `payloadcms/payload`), metadatos de npm
(`npm view <pkg> peerDependencies engines`). Límite: `npm audit` informa rangos afectados; **no prueba explotabilidad**
en este despliegue (p. ej. GHSA-p293 solo aplica a servidores Windows; el portal se despliega en Linux).

### Hechos de compatibilidad relevantes (observados)

- `@payloadcms/next@3.91.0` exige `next >=16.3.3 <17` como peer: **Payload y Next deben subir juntos** (la orden original
  "a) Payload, b) Next" no es instalable por separado sin forzar peers).
- `payload@3.92.0` exige Node `^22.23.4 || >=24.22.1`; la imagen del CMS usa `node:22.17.0-alpine` y el equipo local Node
  24.18.0 ⇒ **se elige 3.91.0** (Node ≥20.18.1), el mínimo que npm marca como corregido.
- `@payloadcms/email-nodemailer@3.91.0` depende de `nodemailer ^10.1.1` (cambio declarado como breaking en 3.91.0 solo si se
  pasa un `transport` propio; el CMS usa `transportOptions`). nodemailer 10 trae sus tipos (`dist/cjs/nodemailer.d.ts`).
- El portal (`app/api/contact/route.ts`) importa `nodemailer` sin declararlo en el `package.json` raíz: depende del hoisting
  de la dependencia del CMS. Riesgo de mantenimiento, no se cambia aquí.
- zod: único import directo en `tests/fixtures/schemas.ts` (API básica `z.object/array/nullable/optional/any/max`, compatible
  con v4). Otro consumidor: `eslint-plugin-react-hooks` (dev, acepta `^3.25 || ^4`). Payload 3.91 no depende de zod.
- **Payload 3.90.0 requiere migración de esquema** en bases relacionales: columna `reset_password_requested_at` en colecciones
  auth (`users`) y `_object_key` solo en colecciones upload con `clientUploads` (no es el caso aquí, ver §6). La BD local está gestionada por `push`
  (`payload_migrations` = `dev:-1`); producción usa migraciones manuales encadenadas (`apps/cms/src/migrations/README.md`).
  La migración manual ya existe (ver §5).

## 3. Decisión por paquete

| Paquete | Antes | Después | Motivo |
|---|---|---|---|
| payload + todos los `@payloadcms/*` | 3.87.1 (mezcla exacta y `^`) | 3.91.0 exacto (todos) | mínimo corregido compatible con Node 22.17/24.18; versión única obligatoria |
| next (portal y CMS) | 16.2.12 | 16.4.3 | mínimo corregido; peer de Payload 3.91 |
| eslint-config-next (CMS, dev) | 16.2.6 | 16.4.3 | alineado con next en el CMS (eslint 9) |
| eslint-config-next (raíz, dev) | ^15.4.11 | sin cambio | la raíz usa eslint 8 + `.eslintrc.json`; la 16.x exige eslint ≥9 (migración aparte) |
| @sentry/nextjs | ^10.69.0 | ^10.76.2 (última 10.x) | fix ≥10.75.2 sin saltar a 11.x (major) |
| sharp (CMS + override raíz) | 0.35.3 | 0.35.5 | fix librsvg/libheif |
| nodemailer (CMS) | ^9.0.3 | ^10.2.1 | requerido por email-nodemailer 3.91 y fix ≥10.1.4 |
| zod (raíz) | ^3.23.8 | ^4.6.7 | solo lo usa un fixture de tests; API compatible |
| overrides transitivos (`undici`, `fast-uri`, `js-yaml`, `brace-expansion`) | ^7.29.0 / ^4.1.2 / ^4.3.1 / ^1.1.18 | ^7.30.1 / ^4.2.3 / ^4.3.2 / ^1.1.21 | ya existían; solo se sube el piso dentro del mismo major |
| nanoid, source-map-js, fast-copy (transitivos) | 3.3.17 / 1.2.1 / 3.0.2 | 3.3.20 / 1.2.2 / 3.1.0 | `npm update` dentro del rango declarado por sus dependientes; sin override nuevo |
| happy-dom (vía @lexical/headless 0.50.0) | 20.14.6 | sin cambio | el fix es 21.0.4 (major) y `@lexical/headless` pide `^20.9.0`; bloqueado upstream |

**Nota de instalación (hecho observado):** un `npm install` normal con npm 12 dejó la familia Payload y `nodemailer`
anidados en `apps/cms/node_modules` (no en la raíz). Efectos: los `vi.mock('payload')` de las pruebas dejaron de aplicar
(132 pruebas rojas) y `app/api/contact/route.ts` del portal ya no resolvía `nodemailer`. Se repitió la instalación desde el
lockfile previo con `--legacy-peer-deps` (que es lo que pide `apps/cms/.npmrc`, ignorado por npm al correr desde la raíz) y
la disposición volvió a ser la de antes (todo izado a la raíz). Cualquier `npm install` futuro debe usar ese flag.

## 4. Rollback

1. Restaurar desde `scratchpad/dep-sec-backup/`: `package.json`, `package-lock.json`, `cms-package.json` → `apps/cms/package.json`.
2. `npm ci` en la raíz (reinstala exactamente el lockfile anterior).
3. Si el CMS de desarrollo llegó a hacer `push` de columnas nuevas (`reset_password_requested_at`), son aditivas y NULLABLE;
   3.87.1 las ignora. No hace falta revertirlas en local.
4. Revertir `tests/unit/dependency-versions.spec.ts` (o bajar los mínimos) para que la guardia no quede roja.

## 5. Riesgos remanentes y decisiones pendientes

- **Migración de despliegue (resuelta):** `apps/cms/src/migrations/20261026_220000_dep_sec_01_users_reset_password.ts` y `.json` añaden
  `users.reset_password_requested_at` (timestamptz, NULLABLE, sin DEFAULT ni relleno; idempotente; `down` vacío, solo hacia adelante). Escrita a mano,
  encadenada tras `trans_02`. `media._object_key` NO hace falta: no hay `clientUploads` en `payload.config.ts` ni `_objectKey` en `payload-types.ts`
  (RDD: verificado por `tests/unit/dep-sec-01-reset-password-migration.spec.ts`). Pruebas: spec unitaria (RED→GREEN) y BD sintética vacía
  (`unc_synth_empty`, ya eliminada): cadena completa de 14 migraciones con exit 0; cadena sin la última + fila de `users` sintética, luego la nueva: la fila
  conserva sus datos y recibe NULL; reaplicar el `ADD COLUMN IF NOT EXISTS` no falla. Falta solo ejecutarla en staging/producción tras el `pg_dump` verificado.
- esbuild/drizzle-kit (moderada): sin fix upstream; afecta al servidor de desarrollo de esbuild, que no corre en producción.
- Resultado final del audit y pruebas: ver §6 (se completa al cerrar la tarea con la salida real).

## 6. Resultado (26-10-2026, local, sin commit)

**Versiones finales:** payload y todos los `@payloadcms/*` 3.91.0; next 16.4.3; @sentry/nextjs 10.76.2; sharp 0.35.5;
nodemailer 10.2.1; zod 4.6.7; undici 7.30.1; fast-uri 4.2.3; js-yaml 4.3.2; brace-expansion 1.1.21; nanoid 3.3.20;
source-map-js 1.2.2; fast-copy 3.1.0.

**`npm audit --omit=dev`:** 28 (3 críticas, 13 altas, 12 moderadas) → **8 (0 críticas, 3 altas, 5 moderadas)**.
Remanentes, todos transitivos y sin fix compatible:

- happy-dom ≤21.0.3 (GHSA-834v-8h66-3h79) vía `@lexical/headless@0.50.0` ← `@payloadcms/richtext-lexical@3.91.0`: 3 entradas
  altas. Bloqueado upstream (lexical pide `^20.9.0`; el fix es 21.0.4). La sugerencia de npm (bajar richtext-lexical a
  3.78.0) reintroduciría los advisories de Payload: descartada.
- esbuild ≤0.24.2 (GHSA-67mh-4wv8-2f99) vía `@esbuild-kit/*` ← `drizzle-kit@0.31.7` ← `@payloadcms/db-postgres`: 5 entradas
  moderadas. Sin fix (3.92.0 usa el mismo drizzle-kit). Afecta al servidor de desarrollo de esbuild, que no corre en producción.

**Pruebas (antes → después):** vitest 88 archivos / 1847 → 90 / 1864 (las dos guardias nuevas incluidas), todas verdes;
typecheck del portal y `tsc` del CMS verdes; `tests/deploy` 152/152; arnés `--quick` igual que la línea base (solo
`guard-deploy-steps` rojo, conocido); `next build` del portal OK (solo avisos de deprecación de opciones de Sentry).

**Regresiones encontradas y corrección:**

1. Disposición de `node_modules` anidada (ver nota de §3) → reinstalación con `--legacy-peer-deps`.
2. Next 16.4 exige layout raíz por página: `apps/cms/src/app/dashboard/page.tsx` y `monitoring/page.tsx` no lo tenían y el CMS
   de desarrollo devolvía 500 en todas las rutas. Prueba RED `tests/unit/cms-root-layouts.spec.ts`, luego `layout.tsx` mínimo en
   cada carpeta (GREEN).
3. `next dev` 16.4 escribe un bloque `nextjs-agent-rules` en `AGENTS.md` (raíz) y crea `apps/cms/AGENTS.md`. Se quitaron;
   reaparecen en cada arranque salvo `agentRules: false` en `next.config` (decisión pendiente).

**Smoke en vivo (localhost):** login del panel 200; `/api/users/me` anónimo 200 `{user:null}` (comportamiento estándar de
Payload) y autenticado 200; lectura anónima de `reconocimientos` 200 sin filas inactivas (superadmin ve 1 inactiva);
POST anónimo a `reconocimientos` y `media` 403; subida de PNG a Media con superadmin QA 201, archivo servido 200 y borrado 200;
el hook de revalidación llegó al portal (`POST /api/revalidate 200`; el primer intento expiró por la compilación en frío del
servidor de desarrollo); páginas `/`, `/noticias`, `/facultades/odontologia`, `/convenios`, `/ley-5189` 200 sin errores de
consola. El `push` de desarrollo agregó `users.reset_password_requested_at` a la BD local.

**Bloqueo de despliegue confirmado:** `payload generate:types` solo agrega `resetPasswordRequestedAt` a `users` (no hay
`_objectKey` porque no se usa `clientUploads`). Falta la migración manual para producción (§5).
