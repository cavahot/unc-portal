# DEP-06 — Límites de tasa, IP de cliente confiable y tamaño de cuerpo en `/api/*` del portal

**Estado:** implementación local propuesta; pendiente de validación tras nginx real (staging). **Backlog:** DEP-06 = SEC-07 (hallazgo alto de `AUDIT-DEPLOY-2026-10-19.md`: «Rate limit and CORS do not cover `/api/*`»). **Spec base:** `docs/specs/security/SEC-005-guardia-rutas-cms.md` (el CORS no es autenticación). **RDD:** `docs/research/evidence-register.md` (RDD-DEP-14, RDD-DEP-15). No autoriza pentest externo.

## Contrato

- El límite de tasa y el tope de cuerpo se aplican **dentro de cada handler público** del portal, sin depender del `matcher` de `proxy.ts` (que excluye `api/` y no se cambia: afectaría páginas). Rutas cubiertas: `POST /api/contact`, `GET /api/preview`, `POST /api/revalidate`, `POST /api/monitoring`.
- Orden fijo en cada handler: (1) límite de tasa por IP → 429; (2) tamaño por `Content-Length` → 413 (solo rutas con cuerpo); (3) autenticación/secreto propios de la ruta (sin cambios); (4) lectura acotada del cuerpo → 413; (5) lógica existente. El límite va **antes** de la comprobación del secreto para frenar la fuerza bruta de `PREVIEW_SECRET` y del Bearer de `revalidate`.
- Los mensajes y códigos de éxito/validación existentes **no cambian**. Rutas no listadas (`health`, `disable-preview`) no cambian.

### IP de cliente confiable (`lib/security/clientIp.ts`)

- `getClientIp(headers)` lee **solo `x-real-ip`**. Justificación (`infrastructure/nginx/nginx.conf:102,144,155,187`): nginx hace `proxy_set_header X-Real-IP $remote_addr`, que **sustituye** cualquier `X-Real-IP` enviado por el cliente. `X-Forwarded-For` se fija como `$proxy_add_x_forwarded_for` (cadena `cliente-controlado, $remote_addr`): el primer valor lo controla el cliente y para elegir el correcto habría que conocer cuántos proxies hay delante; `x-real-ip` evita esa dependencia. **`x-forwarded-for` NO se lee en ningún caso**; `request.ip` tampoco (no existe en Next 16.2.12, ver RDD-DEP-14).
- Se valida el formato (IPv4/IPv6 literal, ≤ 45 caracteres). Un valor mal formado se trata como ausente (evita claves arbitrarias gigantes en el mapa).
- **Sin `x-real-ip` válido** → identificador fijo `no-ip`. Decisión: un único cubo compartido. Alternativas descartadas: (a) `unknown`/`undefined` sin nombre y sin documentar (mismo efecto pero accidental); (b) caer a `x-forwarded-for` o a un valor aleatorio por petición (permite **evadir** el límite rotando cabeceras o no enviando ninguna). El cubo compartido falla hacia **limitar**, no hacia permitir. Coste: en acceso directo sin proxy (desarrollo local, llamadas servidor-a-servidor como el hook del CMS hacia `revalidate`) todos comparten cuota; por eso `revalidate` tiene un tope holgado (120/min).
- Límite del control: confía en que el contenedor del portal solo sea alcanzable a través de nginx (`compose.prod.yaml`: servicio `portal` en red `internal`, sin `ports`). Si el portal se publicara directamente, un cliente podría fijar `x-real-ip` y evadir el límite.

### Limitador (`lib/security/rateLimit.ts`)

- `createRateLimiter({ limit, windowMs, now?, maxKeys? })` → `{ check(key) }`. Ventana deslizante **por registro de marcas de tiempo**: se cuentan las peticiones aceptadas cuya marca esté dentro de `(now - windowMs, now]`. Las rechazadas **no** se registran (un atacante no se prolonga a sí mismo el bloqueo indefinidamente ni crece la memoria).
- `check` devuelve `{ allowed, limit, remaining, retryAfterSeconds }`. `retryAfterSeconds` = segundos hasta que expira la marca más antigua de la ventana (≥ 1).
- `now` es inyectable (reloj de prueba). Por defecto `Date.now`.
- Memoria acotada: sin `setInterval`; al superar `maxKeys` (10 000 por defecto) se purgan claves expiradas y, si siguen excediendo, las más antiguas por orden de inserción. Límite conocido: una inundación con más de `maxKeys` IPs distintas puede expulsar entradas legítimas.
- Almacén **en memoria por instancia y por proceso**: no se comparte entre réplicas ni sobrevive a un reinicio. **La decisión de un almacén compartido (Redis u otro) queda PENDIENTE** y no se toma aquí. Con N réplicas el límite efectivo es hasta N × `limit`.
- `tooManyRequests(result, message)` construye la respuesta 429 con `Retry-After` y `X-RateLimit-*`.

### Tope de cuerpo (`lib/security/bodyLimit.ts`)

- `readBodyLimited(request, maxBytes)` → `{ ok: true, text }` o `{ ok: false }` (413). Rechaza si `Content-Length` válido excede el tope **sin leer** el cuerpo; además lee el flujo contando bytes reales y corta (`cancel`) al exceder, porque `Content-Length` puede faltar (chunked) o mentir. Un `Content-Length` no numérico se ignora y manda el conteo real.

### Parámetros por ruta

| Ruta | Límite | Ventana | Cuerpo máx. | Nota |
|---|---|---|---|---|
| `POST /api/contact` | 5 | 60 s | 32 KiB | Mantiene el 5/min previo; 4000 caracteres UTF-8 caben (≤ 16 KB). |
| `GET /api/preview` | 20 | 60 s | n/a | Frena fuerza bruta del `secret`; uso editorial legítimo es mucho menor. |
| `POST /api/revalidate` | 120 | 60 s | 8 KiB | Holgado: el CMS llama sin `x-real-ip` (cubo `no-ip`). |
| `POST /api/monitoring` | 60 | 60 s | 1 MiB | Túnel de Sentry; el tope es una HIPÓTESIS razonable, ajustar con datos reales. |

## `proxy.ts`

- Se **elimina** la rama `pathname.startsWith('/api/')` (CORS `Allow-Credentials: true` + CSP + cabeceras de límite): nunca se ejecutaba porque el `matcher` excluye `api/` (código muerto que simulaba protección y, de activarse, habría abierto CORS con credenciales hacia `NEXT_PUBLIC_CMS_URL`). El `matcher` **no cambia**.
- La IP del límite de páginas pasa a `getClientIp(request.headers)`: se quita `request.ip` (inexistente en Next 16) y el último valor de `x-forwarded-for`. El límite de páginas (120/min en memoria) es el mismo y comparte las mismas limitaciones.
- **CORS:** el portal no emite cabeceras CORS para `/api/*` (misma origen). Los handlers no deben interpretarse como protegidos por CORS: **CORS no es autenticación**; lo que protege es el secreto/Bearer de cada ruta.

## Arnés: `guard-api-coverage`

- Antes: rojo si `proxy.ts` trata `/api/` y el `matcher` excluye `api/`. Al eliminar el código muerto ese patrón deja de existir y el guard se pondría verde **sin** que haya protección real.
- Regla mínima añadida: además de lo anterior, cada handler de `RATE_LIMITED_API_ROUTES` (`contact`, `preview`, `revalidate`, `monitoring`) debe importar `security/rateLimit` y llamar a `.check(` (código sin comentarios). Handler ausente o sin limitador → finding. Límite: análisis textual; no prueba que el límite sea efectivo (eso lo hacen las pruebas vitest).

## Escenarios Given/When/Then (negativos primero)

1. **Rotar `x-forwarded-for` no evade:** dado `x-real-ip: 203.0.113.9` fijo y 6 POST a `contact` con `x-forwarded-for` distinto cada vez, entonces el 6.º recibe 429.
2. **6.º POST de contact:** dados 5 POST válidos en la ventana desde la misma IP, el 6.º → 429 con `Retry-After` (entero ≥ 1) y no se envía correo.
3. **`x-forwarded-for` ignorado:** dado `x-forwarded-for: 1.2.3.4` y sin `x-real-ip`, `getClientIp` devuelve `no-ip`, no `1.2.3.4`.
4. **Sin `x-real-ip`:** dos peticiones sin cabecera comparten el cubo `no-ip`; no se usa la cadena `undefined`, ni se concede cuota ilimitada. Un `x-real-ip` mal formado (`<script>`, > 45 caracteres) → `no-ip`.
5. **IPs distintas no se bloquean entre sí:** agotada la cuota de 203.0.113.9, 203.0.113.10 sigue pasando.
6. **Cuerpo > tope → 413:** `contact` con `Content-Length` > 32 KiB, y `monitoring` con cuerpo real > 1 MiB sin `Content-Length`, → 413 sin enviar correo ni llamar a `fetch`.
7. **`Content-Length` mentiroso:** declara 10 pero el cuerpo real excede el tope → 413 (se cuenta el flujo).
8. **Ventana expira y libera:** con reloj inyectado, tras `windowMs` desde la primera marca el siguiente `check` vuelve a permitir; `remaining` se restablece.
9. **Ventana deslizante:** las marcas salen una a una (no se reinicia todo de golpe a los 60 s).
10. **Rechazadas no extienden el bloqueo:** insistir durante el bloqueo no retrasa el `retryAfterSeconds`.
11. **`preview`:** el 21.º GET en la ventana → 429 antes de comparar el secreto; dentro del límite, secreto inválido → 401 y válido → redirige (comportamiento previo intacto).
12. **`revalidate`:** el 121.º POST → 429; dentro del límite, sin Bearer → 401 y con Bearer válido → 200 (intacto).
13. **`monitoring`:** el 61.º POST → 429; envelope válido sigue reenviándose a Sentry con `fetch` simulado.
14. **Rutas no listadas no cambian:** `health` y `disable-preview` no importan el limitador.
15. **`proxy.ts`:** no contiene `request.ip` ni rama `/api/`; `matcher` sigue excluyendo `api/`.
16. **Arnés:** `guard-api-coverage` rojo antes del cambio (handlers sin limitador); verde después; un handler sin limitador lo vuelve rojo.

## Fuera de alcance

- Almacén compartido de límites (Redis u otro): **decisión pendiente**, no tomada.
- Límite de tasa en nginx (`limit_req` por zona para `/api/`): DEP-12.
- CORS del CMS (`apps/cms/src/middleware.ts`, trata `Origin` vacío como permitido): lo cubre la autenticación por rol en cada handler (DEP-04); no se toca.
- `revalidate` con longitudes distintas (500 en vez de 401), preview con token firmado y validación del DSN del cliente en `monitoring` (SSRF acotado): DEP-16.

## Hipótesis a validar en staging (no verificadas)

- H1: tras nginx real, `x-real-ip` llega con la IP pública del cliente (no la de un balanceador previo; si hay CDN/LB delante habrá que configurar `set_real_ip_from`, DEP-12).
- H2: Next 16.2.12 en modo standalone entrega `x-real-ip` tal cual al handler (no lo reescribe).
- H3: el hook de revalidación del CMS no supera 120 llamadas/min en cargas masivas (importación de noticias); si lo hace recibirá 429 y solo registra un `console.error`.
- H4: 1 MiB cubre los envelopes reales de Sentry del portal.

## Pruebas y rollback

- `tests/unit/api-rate-limit.spec.ts` (limitador, `getClientIp`, `readBodyLimited`), `tests/unit/api-public-routes-limits.spec.ts` (handlers reales con `nodemailer`, `fetch`, `next/headers`, `next/navigation`, `next/cache` simulados), `harness/guards.test.mjs` (guard).
- Rollback: borrar `lib/security/{rateLimit,clientIp,bodyLimit}.ts`, revertir las cuatro rutas de `app/api`, `proxy.ts` y el guard. No hay migraciones ni datos.
