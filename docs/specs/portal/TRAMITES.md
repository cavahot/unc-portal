# Trámites — /tramites desde el CMS (INST-05)

Estado: en implementación. Tarea: `odd/tasks/tramites-cms.md`. Regla: todo el contenido institucional fluye base de datos → CMS → portal; nada escrito en el código.

## 1. Problema (hecho observado)

`/tramites` muestra los requisitos de ingreso, matrícula y egreso de las seis facultades, pero los datos (≈25 trámites con requisitos, artículos, horarios y contactos) están escritos en `components/tramites/FacultadTabs.tsx` (529 líneas, componente de cliente con pestañas). Un cambio de requisitos exige un despliegue y el contenido no pasa por roles, revalidación ni auditoría del CMS. La página usa además el estilo oscuro anterior. Las pestañas ocultan el contenido de las facultades no activas a buscadores e impresión.

## 2. Comportamiento

### 2.1 Modelo (colección `tramites`)

| Campo | Tipo | Regla |
| --- | --- | --- |
| `facultad` | relación a `facultades` | obligatorio |
| `titulo` | texto | obligatorio, ≤ 200 |
| `descripcion` | área de texto | opcional, ≤ 1000 |
| `requisitos` | lista de `{ texto }` | `texto` obligatorio, ≤ 600; máx. 30 |
| `nota` | área de texto | opcional, ≤ 600 |
| `etiqueta` | texto | opcional, ≤ 40 (p. ej. «Art. 150°») |
| `orden` | número | por defecto 99; menor = primero dentro de su facultad |
| `activa` | casilla | por defecto verdadera |

No se modela el enlace opcional por trámite (`linkHref`): ningún dato actual lo usa.

### 2.2 Acceso y revalidación

Lectura anónima solo de los activos (`readFlagOrInstitutional('activa')`); crear, editar y borrar con `canWriteInstitutional`. Guardar o borrar revalida la etiqueta `tramites` (y se añade a `ALLOWED_TAGS` de `/api/revalidate`).

### 2.3 Migración

Crea `tramites` y `tramites_requisitos` (más la columna de bloqueo en `payload_locked_documents_rels`). Idempotente (`IF NOT EXISTS`, bloques `DO $$`); `down` se niega a correr si `tramites` tiene filas. Solo hacia adelante: no toca tablas existentes salvo agregar la columna de bloqueo.

### 2.4 Consulta del portal

`getTramites()` devuelve `ok` (grupos por facultad), `empty` (el CMS respondió sin trámites activos) o `unavailable` (el CMS no respondió); nunca lanza y nunca devuelve datos escritos en el código. Los grupos van en el orden alfabético de la facultad, los trámites por `orden` y título. Un trámite sin facultad o sin título se descarta. Solo se muestran los campos que existen.

### 2.5 Siembra

`scripts/seed-tramites.mjs`: dry-run por defecto, `--apply` con credenciales de CMS (como las demás siembras), local salvo `--allow-remote` y https. Los datos salen del contenido que hoy publica `FacultadTabs.tsx` (copiado programáticamente, no retranscrito). Idempotente: omite un trámite si ya existe uno con la misma facultad y título; nunca pisa ediciones. Las facultades se buscan por slug del CMS.

### 2.6 Página `/tramites`

Cabecera compartida (`PageHero`) con un índice de facultades (anclas). Una sección por facultad; cada trámite es una fila: a la izquierda título, etiqueta y descripción; a la derecha la lista de requisitos y la nota. Sin pestañas, sin tarjetas iguales en cuadrícula, sin etiqueta sobre el título, sin modales. Estados: `empty` y `unavailable` como aviso en línea (reintentar solo en `unavailable`), `error.tsx` de la ruta. Mensajes en es, gn, en y pt-BR con los mismos marcadores; es sin voseo. El aviso de ayuda enlaza a `/contacto` (sin correo escrito en la página).

## 3. Criterios (Given/When/Then)

1. Given trámites activos en el CMS, When se abre `/tramites`, Then aparecen agrupados por facultad con sus requisitos y notas y un índice de anclas.
2. Given el CMS caído, When se abre `/tramites`, Then se muestra «no disponible» con «Intentar de nuevo» y Contacto; no se muestran requisitos escritos en el código.
3. Given el CMS sin trámites activos, When se abre `/tramites`, Then se muestra «vacío» sin «Intentar de nuevo».
4. Given un trámite inactivo, When se consulta como anónimo, Then no aparece (el CMS lo filtra y la consulta lo descarta por defensa).
5. Given la migración aplicada dos veces, Then la segunda no falla ni duplica nada; Given filas en `tramites`, When se intenta `down`, Then se rechaza.
6. Given la siembra aplicada dos veces, Then la segunda omite todo; Given un trámite editado en el CMS, Then la siembra no lo modifica.
7. Given un idioma distinto de es, Then los enlaces llevan el prefijo del idioma y las claves de mensajes coinciden con es.

## 4. Fuera de alcance

Traducción del contenido de los trámites (el CMS no tiene localización); enlace opcional por trámite; logos por facultad; trámites generales de Secretaría (los de `t1..t6` de los mensajes no se publicaron nunca).
