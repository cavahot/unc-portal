# SEC-027 — Evidencia de verificación de middlewares y controles (2026-11-06)

**Alcance autorizado:** entorno LOCAL (portal `localhost:3000`, CMS `localhost:3002`, Postgres de desarrollo), peticiones sueltas anónimas con datos sintéticos, análisis estático y pruebas unitarias. **No se probó producción, ni staging, ni nginx, ni S3 real; no hubo escaneo agresivo, fuerza bruta ni fuzzing.**
**Rama:** `test/sec-middleware-regression` (sobre `feat/transparencia-institucional-cms`). **Regla:** `docs/security/REGLA-SEC-027-GATE-ANTES-DE-PUBLICAR.md`.
**Lectura:** un resultado verde demuestra solo el alcance probado. La respuesta de una IA no es evidencia única: cada fila cita la prueba reproducible.

## 1. Middlewares inventariados

| Componente | Archivo | Qué hace | Verificado |
| --- | --- | --- | --- |
| Portal `proxy` (Next 16) | `proxy.ts` | Idioma (next-intl), límite de tasa por IP (120/min, en memoria), nonce + CSP, cabeceras `X-RateLimit-*`. El `matcher` excluye `/api/*`, estáticos y metadatos. | Sí: pruebas nuevas + cabeceras reales |
| CMS `middleware` | `apps/cms/src/middleware.ts` | CORS de `/api/*` contra `PORTAL_URL`/`NEXT_PUBLIC_SERVER_URL`; bloquea entre orígenes los endpoints internos. | Sí: pruebas nuevas + peticiones reales |
| Guardas por ruta | `lib/security/*`, `apps/cms/src/utilities/routeGuard.ts` | Tope de cuerpo, límite de tasa por handler, secretos fuertes, token HMAC de preview, `requireRole`. | Sí: peticiones reales + arnés |

## 2. Controles

| ID | Componente | Prueba | Esperado | Observado | Clasificación | Severidad / riesgo remanente |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-027-01 | CMS rutas internas | `GET /api/{alerts,logs,metrics,auditoria,dashboard/stats,dashboard/noticias}` y `POST /api/setup/create-bucket` sin sesión | 401/403 | 401 en todas; `GET create-bucket` 405 | confirmado (local) | — |
| SEC-027-02 | CMS CORS | `Origin: https://evil.example` a `/api/logs`; preflight a `/api/users/login` | 403; nunca reflejar el origen ajeno | 403; preflight 204 con `allow-origin = PORTAL_URL`. 20 pruebas (3 fallan si se rompe el reflejo) | confirmado | Bajo: `Allow-Credentials: true` depende de que `PORTAL_URL` sea correcto en producción |
| SEC-027-03 | Payload anónimo | `GET /api/users`, `/api/glosario-guarani`, `/api/auditoria`; GraphQL; `/admin`; `noticias?draft=true` | Denegado / sin borradores | 403, 403, 401; GraphQL 404 (`graphQL.disable`); `/admin` 404 (ruta `/accesoSeguro`); solo `published` | confirmado (local) | — |
| SEC-027-04 | Portal API pública | `revalidate` sin/ con secreto falso; `preview` sin token; `contact` GET y cuerpo de 40 KB; `monitoring` con DSN ajeno | 401 / 401 / 401 / 405 / 413 / rechazo | 401, 401, 401, 405, 413, 503 | confirmado (local) salvo `monitoring` (**pendiente**) | `monitoring` devolvió 503; no se determinó si por el DSN ajeno o por falta de configuración local (a confirmar con el DSN configurado) |
| SEC-027-05 | Portal límite de tasa | 126 peticiones de una IP; rotar `x-forwarded-for`; otra IP | 429 con `Retry-After`; no evadible; sin contagio | Cumple (pruebas) | confirmado en código; **condicional en despliegue** | Medio: el almacén es memoria por instancia y se reinicia; con varias instancias el límite se multiplica. La IP confiable es `x-real-ip` de nginx: **no verificado en nginx real** |
| SEC-027-06 | Portal CSP | Producción: `default-src 'none'`, `frame-ancestors 'none'`, `object-src 'none'`, nonce por petición, sin `unsafe-eval`, sin `localhost`/`http:` | Cumple | Cumple (pruebas). En desarrollo es solo Report-Only (esperado) | confirmado en código; **condicional en despliegue** | Medio: `script-src` y `style-src` llevan `'unsafe-inline'` (el nonce neutraliza el inline de scripts en navegadores modernos; los estilos siguen abiertos). **No se midió la cabecera en producción** |
| SEC-027-07 | Cabeceras del portal | `HSTS`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` | Presentes | Presentes. `X-Powered-By: Next.js` expuesto | confirmado (local) | Bajo: revelar la tecnología; `poweredByHeader: false` lo quita |
| SEC-027-08 | Dependencias de producción | `npm audit --omit=dev` | Sin críticas/altas sin tratar | 22 (0 críticas, **3 altas**, 10 moderadas, 9 bajas). Las 3 altas son la cadena `@payloadcms/richtext-lexical` → `@lexical/headless` → `happy-dom`; el «arreglo» propuesto es una **degradación** a `richtext-lexical@0.1.9` | **pendiente** (triage) | Alto hasta evaluar explotabilidad: bloqueador SEC-027 si no se trata |
| SEC-027-09 | Arnés | `node harness/check.mjs --quick` | Verde | 12 guardas en verde (secretos versionados, rutas con rol, cobertura de API, JSON-LD, paridad de entorno, semillas sin clave, respaldo cifrado, etc.) | confirmado | — |
| SEC-027-10 | Calidad | `npm run lint`; `tsc` portal y CMS; `vitest` completo | Verde | Lint y ambos `tsc` sin errores; 141 archivos, 2386 pruebas | confirmado | — |
| SEC-027-11 | CI | `.github/workflows/ci.yml` | Corre en todo cambio que llegue a producción; incluye análisis de dependencias | Corre solo en PR/push a `main` y `develop`; **sin** `npm audit`, CodeQL ni escaneo de imágenes; el `typecheck` lleva el comentario «error preexistente no bloquea» | **pendiente** | Medio: los PR apilados (7, 9, 10) apuntan a ramas de trabajo y **no ejecutan CI** |
| SEC-027-12 | Glosario guaraní | Aprobación solo por superadmin con fuente oficial | Cumple | Cubierto por la suite (hooks y endpoints) | confirmado | Ninguna fila aprobada hoy |

## 3. Qué NO está cubierto (no se puede declarar seguro)

- Producción, staging y nginx: cabeceras reales, `x-real-ip`, TLS, `set_real_ip_from`.
- S3/SeaweedFS: acceso anónimo al bucket, políticas, URL firmadas.
- Backup y restauración **verificados** (el arnés solo comprueba que el flujo exista y esté cifrado).
- Autorización por rol de cada colección con cuentas reales de cada rol (matriz de `TASK-SEC-001` SEC-03 sin aprobación del Product Owner; conflicto `FLUJO_EDITORIAL.md`).
- Revisión independiente (la revisión automática de Gentle AI está desactivada por decisión del dueño).
- `docs/security/TASK-SEC-001-hardening-portal-unc.md` está **desactualizado** (línea base del 16-10): varias subtareas ya se aplicaron (p. ej. `requireRole` en las rutas internas) y su estado no se actualizó.

## 4. Regresión añadida

`tests/unit/sec-middleware-regression.spec.ts` (20 pruebas): CORS del CMS, endpoints internos, matcher del portal, 429 y no evasión por `x-forwarded-for`, CSP de producción y nonce único. Verificada con una mutación (romper el reflejo de origen hace fallar 3 pruebas).
