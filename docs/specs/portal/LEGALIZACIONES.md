# Legalizaciones — /legalizaciones desde el CMS (INST-11)

Estado: en implementación. Tarea: `odd/tasks/legalizaciones-cms.md`. Regla: todo el contenido institucional fluye base de datos → CMS → portal; nada escrito en el código. Patrón: el de `/titulos` (`docs/specs/portal/TITULOS.md`).

## 1. Problema (hecho observado)

`/legalizaciones` tiene todo su contenido escrito en el código de la página: 3 categorías de documentos con sus requisitos, 10 pasos del procedimiento, el plazo «12–24 hs», el arancel «G. 50.000», la dependencia y el horario, y los textos del título y la descripción. Además:

- No usa el sistema de mensajes: el archivo `messages/*/pages.legalizaciones.json` existe pero la página no lo lee (y su contenido describe otros servicios: diplomas, certificados), así que la página no cambia con el idioma.
- El arancel «G. 50.000» está escrito a mano **y además existe** en el CMS como «Legalizaciones — 50000» (`aranceles-rectorado`): dos fuentes que pueden divergir.
- Estilo oscuro anterior, redacción en voseo («¿Qué tipo de documento querés legalizar?», «Identificá tu caso») y datos de demostración implícitos (título de la página en `generateMetadata` con plazo y arancel fijos).

## 2. Comportamiento

### 2.1 Global `legalizaciones`

Mismo modelo que `titulos-inscripcion`, sin la nota del CONES (no aplica): `titulo`, `descripcion`, `unidad`, `plazoMinHoras`, `plazoMaxHoras`, `arancel` (relación a `aranceles-rectorado`; el monto sale de esa fila, nunca se escribe aquí), `tipos[]` (categorías de documentos con `slug` único, `etiqueta`, `titulo`, `subtitulo`, `acento` de lista cerrada y `requisitos[]`) y `pasos[]` (`responsable`, `descripcion`). Los campos y sus validaciones son los mismos que los de `titulos-inscripcion` (se comparten, no se copian).

Acceso: lectura pública; escribir con `canUpdateGlobal`; auditoría con `makeAuditGlobalAfterChange`; guardar revalida la etiqueta `legalizaciones` (añadida a `ALLOWED_TAGS`).

El contenido es solo en español y el portal traduce la interfaz (convención de `/titulos`; la localización de Payload se activó solo para privacidad y accesibilidad).

### 2.2 Migración

Crea las tablas del global y de sus listas, el enumerado del acento y la relación con aranceles. Idempotente; `down` se niega a correr si el global tiene filas. Solo hacia adelante; no toca tablas existentes.

### 2.3 Consulta del portal

`getLegalizaciones()` devuelve `ok`, `empty` o `unavailable` con las mismas reglas que `getTitulosInscripcion()` (mismo mapper); nunca lanza y nunca devuelve contenido escrito en el código. Con `depth=1` puebla el arancel; etiquetas `legalizaciones` y `aranceles-rectorado`.

### 2.4 Siembra

`scripts/seed-legalizaciones.mjs`: dry-run por defecto, `--apply` con credenciales de CMS, local salvo `--allow-remote` y https. Carga el contenido hoy publicado (3 categorías, 10 pasos, plazo 12–24 h, unidad «Secretaría General — UNC», español en «usted») y enlaza la fila «Legalizaciones» de `aranceles-rectorado` (el monto no se carga). Idempotente: si el global ya tiene contenido, se omite y nunca se pisa.

### 2.5 Página

Cabecera compartida con los datos del trámite (plazo, arancel, unidad), índice de categorías, requisitos por categoría y pasos numerados, con los componentes de `/titulos`. Estados `empty` y `unavailable` como aviso en línea (reintentar solo en `unavailable`), `error.tsx`, esqueleto claro y 4 idiomas; español sin voseo. Cierre con salidas a `/titulos`, a los aranceles y a Contacto.

## 3. Criterios (Given/When/Then)

1. Given contenido cargado, When se abre la página, Then se ven las categorías, el plazo, el arancel de la fila enlazada y los pasos.
2. Given el CMS caído, Then «no disponible» con «Intentar de nuevo»; ningún dato escrito en el código.
3. Given el global sin contenido, Then «vacío» sin «Intentar de nuevo».
4. Given el arancel sin enlazar o inactivo, Then «Consulte el monto vigente» con enlace a los aranceles; nunca un monto inventado.
5. Given la migración aplicada dos veces, Then la segunda no falla; Given filas, When `down`, Then se rechaza.
6. Given la siembra aplicada dos veces, Then la segunda omite; Given contenido editado, Then no se modifica.

## 4. Fuera de alcance

Revisión jurídica o de la fuente de los requisitos y los 10 pasos (se cargan tal como estaban); traducción del contenido del CMS; confirmar plazo y arancel actuales con Secretaría General.
