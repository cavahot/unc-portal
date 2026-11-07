# Privacidad y accesibilidad — /privacidad y /accesibilidad desde el CMS (INST-08)

Estado: en implementación. Tarea: `odd/tasks/legales-cms.md`. Regla: todo el contenido institucional fluye base de datos → CMS → portal; nada escrito en el código.

## 1. Problema (hecho observado)

`/privacidad` (7 secciones) y `/accesibilidad` (introducción, 6 características y el correo de contacto) tienen su texto en `messages/{es,gn,en,pt-BR}/pages.{privacidad,accesibilidad}.json` y el correo `secgral@unc.edu.py` escrito en el código de la página. Un cambio en un texto legal exige un despliegue. Ambas usan el estilo oscuro anterior y la de accesibilidad usa emojis como iconos y voseo en español («Podés», «Usá», «escribinos»).

## 2. Comportamiento

### 2.1 Idiomas: un texto por idioma

El CMS no tenía localización. Se activa la localización de Payload (`es` por defecto, `en`, `pt-BR`, `gn`) **solo para los campos marcados `localized`** de estos dos globals; el resto del CMS no cambia. El portal pide el idioma de la persona con `fallback-locale=es`; el guaraní usa su propio texto (hoy copia del español, como el resto de las claves nuevas) hasta la revisión nativa.

### 2.2 Global `politica-privacidad`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `ultimaActualizacion` | fecha sin hora | obligatoria, no localizada; se muestra solo mes y año en el idioma de la persona |
| `secciones` | lista localizada | 1 a 20 filas; cada una `titulo` (≤ 120) y `contenido` (≤ 3000), ambos obligatorios |

### 2.3 Global `declaracion-accesibilidad`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `descripcion` | texto largo localizado | obligatorio, ≤ 600; es la descripción de la cabecera |
| `caracteristicas` | lista localizada | 1 a 20 filas; cada una `titulo` (≤ 120) y `descripcion` (≤ 400), obligatorios |
| `correoContacto` | correo | obligatorio, no localizado |

Los textos de interfaz (títulos de la cabecera y de las secciones, el llamado «Reportar un problema de accesibilidad» y su frase) siguen en los mensajes, traducidos.

### 2.4 Acceso, auditoría y revalidación

Lectura pública (no hay datos privados); escribir con `canUpdateGlobal`; auditoría con `makeAuditGlobalAfterChange`. Guardar revalida las etiquetas `politica-privacidad` y `declaracion-accesibilidad` (añadidas a `ALLOWED_TAGS` de `/api/revalidate`).

### 2.5 Migración

Crea las tablas de los dos globals (con sus tablas `_locales`), el tipo enumerado de idiomas y las columnas de bloqueo necesarias. Idempotente; `down` se niega a correr si hay filas. Solo hacia adelante. No toca colecciones existentes.

### 2.6 Consulta del portal

`getPoliticaPrivacidad(locale)` y `getDeclaracionAccesibilidad(locale)` devuelven `ok`, `empty` (el CMS respondió sin contenido válido) o `unavailable` (no respondió o forma inesperada); nunca lanzan y nunca devuelven texto escrito en el código. Si en un idioma distinto de `es` no hay contenido válido, se usa el español y la página lo avisa. El correo solo se acepta con forma válida.

### 2.7 Siembra

`scripts/seed-legales.mjs`: dry-run por defecto, `--apply` con credenciales de CMS, local salvo `--allow-remote` y https. Carga el texto actual de los cuatro idiomas (convertido de los mensajes, con el español en forma de «usted»). Idempotente: si un global ya tiene secciones o características en español, se omite y nunca se pisa lo editado.

### 2.8 Páginas

Cabecera compartida (`PageHero`) y fondo claro. `/privacidad`: secciones con título y párrafos (los saltos de línea del CMS separan párrafos) y la fecha de actualización. `/accesibilidad`: características como lista con número (sin emojis) y el llamado de contacto con el correo del CMS. Estados `empty` y `unavailable` como aviso en línea (reintentar solo en `unavailable`), `error.tsx`, esqueleto claro. Mensajes en los cuatro idiomas con los mismos marcadores; español sin voseo.

## 3. Criterios (Given/When/Then)

1. Given contenido cargado, When se abre la página en un idioma, Then se ve el texto de ese idioma.
2. Given un idioma sin texto, Then se muestra el español con un aviso.
3. Given el CMS caído, Then «no disponible» con «Intentar de nuevo»; ningún texto legal escrito en el código.
4. Given el CMS sin contenido, Then «vacío» sin «Intentar de nuevo».
5. Given un correo inválido en el CMS, Then la página no muestra enlace de correo.
6. Given la migración aplicada dos veces, Then la segunda no falla; Given filas, When `down`, Then se rechaza.
7. Given la siembra aplicada dos veces, Then la segunda omite todo; Given un texto editado, Then no se modifica.

## 4. Fuera de alcance

Revisión jurídica del contenido; revisión nativa del guaraní; versionado del texto legal; confirmar que la fecha «agosto de 2026» sea la de la última actualización real.
