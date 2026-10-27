# MAP-01 — Mapa del campus en el footer y en /contacto

**Estado:** implementación local; verificada con pruebas unitarias y navegador local (ver informe). **Solicitud:** Product Owner. **Dirección confirmada:** «Km 210, Ruta PY05, Concepción, Paraguay» (Rectorado). **No** se dispone de coordenadas verificadas: el lugar se resuelve por texto y no se inventan lat/lng.

## Comportamiento

- `components/layout/CampusMap.tsx` (cliente) muestra un póster SVG autocontenido (bloques isométricos abstractos, **no** edificios reales), la dirección y el botón «Ver mapa interactivo». Solo al activarlo se monta el `<iframe>` de Google Maps.
- Siempre visibles: «Cómo llegar» y «Abrir en Google Maps» (`target="_blank" rel="noopener noreferrer"`); no cargan nada hasta que el visitante los pulsa.
- `lib/maps/campusMapUrls.ts` construye las tres URLs desde una constante (`CAMPUS_MAP_QUERY`), sin parámetros, y las valida con `isAllowedGoogleMapsUrl` (usa `safeHref` + host exacto `www.google.com`, https, sin credenciales ni puerto, ruta bajo `/maps`).
- Iframe: `title` localizado, `loading="lazy"`, `referrerPolicy="no-referrer"`, `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"`, sin `allowFullScreen`.
- Footer: tarjeta de contacto, bloque bajo la dirección. `/contacto`: reemplaza el iframe anterior (usaba un place id `0x945c5a1b1b1b…` con aspecto de marcador de posición y `v1234567890`).
- i18n: claves `mapTitle`, `mapLoad`, `mapDirections`, `mapOpen`, `mapPosterLabel`, `mapIframeTitle`, `addressOneLine` en `messages/{es,en,gn,pt-BR}/common.json` (`gn` replica el texto en español, como el resto de ese catálogo).
- Movimiento: el pulso del pin (`.campus-map-pulse` en `app/globals.css`) solo existe bajo `@media (prefers-reduced-motion: no-preference)`.

## Ajuste de maquetación (feedback del Product Owner, pantalla ancha)

- Contenedor del footer `max-w-7xl` a `max-w-[1536px]`: en pantallas de 1780 px o más el contenido ya no queda estrecho y las columnas de navegación tienen ancho para sus etiquetas.
- Rejilla de 12 columnas: desde `lg` identidad 4 + navegación 8 y la tarjeta de contacto en una fila propia de 12; desde `2xl` (1536 px) identidad 3 / navegación 4 / contacto 5. Se descartó repartir 3/4/5 ya en `xl`: a 1280 px la tarjeta (477 px) dejaba columnas internas de ~190 px.
- La tarjeta tiene 2 columnas internas desde `md` (datos + CTA | mapa); en móvil todo se apila. Por debajo de `2xl` el mapa se limita a `max-w-sm` y se alinea a la derecha.
- Etiquetas de navegación sin salto de línea en `lg+` (`whitespace-nowrap`); la flecha de hover pasó a posición absoluta para no restar ancho a la etiqueta.
- Póster 4:3 (viewBox 400x300) con pin centrado y más grande; la dirección es un pie bajo el póster (ya no se superpone); botón verde ancho completo y los dos enlaces en una fila.
- Barra inferior: 3 zonas en rejilla (copyright | enlaces legales centrados | MITIC a la derecha, texto y logo en fila).
- `/contacto`: el bloque en blanco que se veía sobre el footer no es del mapa; es el `Reveal` (opacidad 0 + transición de 700 ms) de la sección, que aparece al entrar en pantalla. El contenedor del mapa pasó de `px-4 pb-4` a `p-4`.

## Escenarios Given/When/Then

1. (neg.) Dado el footer recién cargado, cuando se renderiza, entonces el HTML no contiene `<iframe` ni atributos `src`, `srcset`, `url(http`, `@import` ni preload: cero pedidos externos antes del clic. (`campus-map-component.spec.ts`)
2. Dado el póster, cuando el visitante activa el botón con ratón o teclado (`<button type="button">` nativo), entonces se monta `CampusMapFrame` con la URL constante.
3. (neg.) Dadas URLs con `http:`, `google.com` sin `www`, `www.google.com.evil.com`, `user@host`, puerto, `javascript:`, `//host` o ruta ajena a `/maps`, cuando se evalúa `isAllowedGoogleMapsUrl`, entonces es `false`. (`campus-map-urls.spec.ts`)
4. (neg.) Dadas `buildCampus*Url`, cuando se inspeccionan, entonces no admiten parámetros (aridad 0): ninguna entrada de usuario llega a la URL.
5. Dado el iframe, cuando se renderiza, entonces lleva `title`, `loading=lazy`, `referrerpolicy=no-referrer`, el `sandbox` indicado y no `allowfullscreen`.
6. (a11y) Póster con `role="img"` y `aria-label`; botón y enlaces con foco visible (`focus-visible:ring-2`); contraste claro sobre verde oscuro.
7. (CSP) Dado `lib/csp.ts`, `frame-src https://www.google.com` ya cubre el iframe; no se amplía.

## Tabla RDD (afirmación → evidencia)

| Afirmación | Evidencia | Tipo |
|---|---|---|
| El CSP ya permite el iframe | `lib/csp.ts:55` (dev) y `lib/csp.ts:82` (prod): `frame-src https://www.google.com`; prueba en `campus-map-component.spec.ts` | Hecho observado |
| El póster no necesita `img-src`/`style-src` nuevos | SVG en línea; `style-src 'self' 'unsafe-inline'` (`lib/csp.ts:44,77`); el CSP del portal no gobierna los subrecursos internos del iframe (los rige el de Google) | Hecho observado |
| Enlaces «Cómo llegar»/«Abrir» | Documentación oficial «Maps URLs» de Google (`/maps/dir/?api=1&destination=`, `/maps/search/?api=1&query=`) | Documentación oficial (no consultada en red en esta tarea; formato conocido) |
| Embed sin clave `maps?q=…&output=embed` | **Formato histórico no documentado**; la API oficial «Maps Embed API» (`/maps/embed/v1/place`) exige clave. Se eligió el keyless por restricción de no gestionar claves | Hipótesis / riesgo |
| `t=k` (satélite) es poco fiable | No figura en documentación oficial → se omite | Decisión |
| `allow-same-origin` es aceptable | Con `src` de otro origen aplica al origen de Google, no al del portal; sin él el mapa (cookies/almacenamiento) falla | Razonamiento |
| `allow-popups(-to-escape-sandbox)` | Sin ellos los enlaces internos del mapa (p. ej. «Ver en Google Maps») abren pestañas bloqueadas o también sandboxed | Razonamiento |
| El iframe previo usaba un place id dudoso | `app/[locale]/contacto/page.tsx` (versión previa) línea ~304: `0x945c5a1b1b1b1b1b…`, `v1234567890` | Hecho observado; que muestre el sitio equivocado es hipótesis |

## Riesgos y límites

- Seguimiento de terceros tras el clic: Google recibe la IP y cookies propias. El aviso previo y la carga bajo demanda lo reducen; no lo eliminan. Política de privacidad: valorar mencionarlo (decisión del Product Owner).
- Precisión: una búsqueda por texto puede situar el pin de manera aproximada. Para un pin exacto se necesita el enlace de lugar (place id / `maps.app.goo.gl`) o coordenadas verificadas por la universidad; **pendiente**.
- Google puede cambiar o retirar `output=embed`. Mitigación: los enlaces «Cómo llegar» y «Abrir» siguen funcionando; alternativa futura con clave de Maps Embed API.
- Un redireccionamiento a `consent.google.com` (usuarios de la UE) sería bloqueado por `frame-src`; no se amplía el CSP por no estar probado como necesario.

## Rollback

Revertir: `components/layout/CampusMap.tsx`, `lib/maps/campusMapUrls.ts`, las pruebas `campus-map-*.spec.ts`, las 7 claves de `messages/*/common.json`, el bloque `.campus-map-pulse` de `app/globals.css`, y restaurar el iframe previo en `contacto/page.tsx` y el footer sin el bloque.
