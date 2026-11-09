# VIDEO-01 — Video de YouTube e imágenes dentro del cuerpo

Tarea: `VIDEO-01`. Rama: `feat/video-youtube-imagenes-cuerpo` (hija del tracker `chain/rediseno-portal`).

## Pedido (textual)

- «revisa tambien en la parte de imagne si permite video y link de youtube y otros»
- Ante la propuesta (bloque «Video de YouTube» y arreglo de las imágenes del cuerpo): «Sí, ambos».

## Evidencia (RDD, 2026-11-09)

| Hecho observado | Dónde |
| --- | --- |
| Medios solo admite imágenes, PDF y Word, hasta 10 MB; ningún tipo de video | `apps/cms/src/collections/Media.ts:119` |
| El editor de texto enriquecido es `lexicalEditor()` sin bloques: no hay forma de incrustar un video | `apps/cms/src/payload.config.ts` |
| La CSP del portal bloquea video (`media-src 'none'`) y solo permite incrustar `https://www.google.com` | `lib/csp.ts` |
| El editor deja insertar una imagen en el cuerpo (nodo `upload`), pero los dos renderizadores del portal no tienen ese caso y la imagen desaparece sin aviso | `components/RichText.tsx`, `components/blocks/RichText.tsx` |
| En el volcado de WordPress, 1 de 281 noticias publicadas menciona YouTube y ninguna tiene un video incrustado | conteo local sobre el XML |

## Decisiones

- No se suben archivos de video a Medios: superan el límite de 10 MB y consumirían disco y ancho de banda del VPS. Los videos se alojan en YouTube.
- El portal incrusta desde `https://www.youtube-nocookie.com` (modo de privacidad mejorada: YouTube no pone cookies hasta la reproducción). La CSP abre SOLO ese origen en `frame-src`.
- El CMS guarda la URL que pega la persona, pero solo la acepta si de ella sale un identificador de video válido. El portal vuelve a extraer el identificador al mostrarla (no confía en lo guardado) y arma él mismo la URL de inserción.
- Otros servicios (Vimeo, Facebook) quedan fuera: cada uno es un origen más en la CSP y requiere decisión aparte.

## Comportamiento

### S1 — Bloque «Video de YouTube» en el editor

- Disponible en el cuerpo de las noticias, en el bloque «Texto» de las páginas y en los demás campos de texto enriquecido que usan el editor común. No en «Dos columnas»: su componente del portal (`components/blocks/TwoColumn.tsx`) dibuja un texto fijo y nunca muestra el contenido (defecto previo, fuera de esta tarea).
- Campos: `url` (obligatoria) y `title` (obligatorio, máximo 150 caracteres; es el nombre accesible del reproductor).
- URL aceptadas (http o https): `youtube.com/watch?v=ID`, `m.youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, `youtube.com/shorts/ID`, `youtube.com/live/ID`, `youtube-nocookie.com/embed/ID`. `ID` = 11 caracteres `[A-Za-z0-9_-]`.
- Rechazadas con el mensaje «Pegue el enlace de un video de YouTube (por ejemplo, https://www.youtube.com/watch?v=…).»: otro dominio (incluido `youtube.com.otro.com`), canales, listas sin video, `javascript:`, identificador de otra longitud, texto vacío.

### S2 — Video en el portal

- Given un bloque de YouTube con URL válida, When se muestra la noticia o la página, Then aparece un `iframe` con `src="https://www.youtube-nocookie.com/embed/<ID>"`, el `title` del bloque, `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`, `sandbox` acotado y `allowfullscreen`, en un marco 16:9.
- Given un bloque con URL no válida (dato alterado en la base), Then no se dibuja ningún `iframe`.

### S3 — Imágenes y archivos del cuerpo

- Given un nodo `upload` con la imagen resuelta (consulta con `depth` ≥ 1), Then se muestra con su texto alternativo y la URL absoluta que da `resolveMediaUrl`.
- Given un nodo `upload` que apunta a un PDF o Word, Then se muestra un enlace al archivo con su nombre.
- Given un nodo `upload` sin resolver (solo el id) o con una URL que `resolveMediaUrl` rechaza, Then no se dibuja nada.

### S4 — CSP

- `frame-src` incluye `https://www.youtube-nocookie.com` en desarrollo y en producción; NO incluye `https://www.youtube.com`. `media-src` sigue en `'none'`.

## Límites y riesgos

- La CSP es un control de seguridad (riesgo: ítem 2). Se amplía en un solo origen y el `iframe` lleva `sandbox`.
- Un video de YouTube puede ser borrado o hecho privado por su dueño: el portal no lo detecta.
- No hay vista previa del video dentro del panel del CMS; el bloque muestra sus campos.

## Rollback

Revertir el commit del bloque y el de la CSP. El contenido ya guardado con bloques de YouTube queda en la base; sin el renderizador no se dibuja (se ignora), sin romper la página.
