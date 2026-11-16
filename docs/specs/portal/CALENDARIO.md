# Calendario académico — /calendario-academico desde el CMS (INST-07)

Estado: en implementación. Tarea: `odd/tasks/calendario-cms.md`. Regla: todo el contenido institucional fluye base de datos → CMS → portal; nada escrito en el código.

## 1. Problema (hecho observado)

`/calendario-academico` muestra las fechas del año académico (dos semestres de cinco eventos y cuatro mesas de exámenes finales), pero están escritas en `messages/{es,gn,en,pt-BR}/pages.calendario-academico.json`. Un cambio de fecha exige un despliegue y cada idioma las traduce a mano («mar», «jul», «Diciembre 2025»). No hay colección en el CMS ni un documento fuente en el repositorio, y los textos se declaran «orientativos»: **no hay manera de comprobar que sean las fechas oficiales**. La página usa además el estilo oscuro anterior.

## 2. Comportamiento

### 2.1 Modelo (colección `calendario-academico`)

| Campo | Tipo | Regla |
| --- | --- | --- |
| `titulo` | texto | obligatorio, ≤ 120 (p. ej. «1er Semestre 2026»); es el encabezado del bloque |
| `tipo` | selección | `semestre` o `examenes`, por defecto `semestre` |
| `anio` | número | obligatorio, 2000–2100 |
| `orden` | número | por defecto 99; menor = primero |
| `activa` | casilla | por defecto verdadera |
| `entradas` | lista | 1 a 40 filas |

Cada entrada: `evento` (selección: `inicio-clases`, `inscripcion-tardia`, `parciales-1`, `parciales-2`, `cierre-semestre`, `otro`; obligatorio solo en un `semestre`), `descripcion` (texto ≤ 160; obligatorio si `evento` es `otro`), `inicio` (fecha sin hora, obligatoria) y `fin` (fecha sin hora, opcional; si existe, no puede ser anterior a `inicio`). Las mesas de exámenes no llevan evento: el período se deriva de las fechas.

### 2.2 Acceso y revalidación

Lectura anónima solo de los activos (`readFlagOrInstitutional('activa')`); crear, editar y borrar con `canWriteInstitutional`. Guardar o borrar revalida la etiqueta `calendario-academico` (que se añade a `ALLOWED_TAGS` de `/api/revalidate`).

### 2.3 Migración

Crea `calendario_academico` y `calendario_academico_entradas` (más el enum de `tipo`, el de `evento` y la columna de bloqueo en `payload_locked_documents_rels`). Idempotente; `down` se niega a correr si hay filas. Solo hacia adelante.

### 2.4 Consulta del portal

`getCalendario()` devuelve `ok`, `empty` (el CMS respondió sin bloques activos) o `unavailable` (el CMS no respondió); nunca lanza y nunca devuelve fechas escritas en el código. Muestra el **año académico más reciente** entre los bloques activos. Una entrada sin fecha válida se descarta; un bloque sin entradas válidas se descarta.

### 2.5 Siembra

`scripts/seed-calendario.mjs`: dry-run por defecto, `--apply` con credenciales de CMS, local salvo `--allow-remote` y https. Convierte de forma programática las fechas hoy publicadas en los mensajes (no las retranscribe) a fechas reales. Idempotente: omite un bloque si ya existe uno con el mismo título y año; nunca pisa ediciones.

### 2.6 Página

Cabecera compartida (`PageHero`) con el año académico. Cada semestre es una sección con sus fechas (formato del idioma: «16–27 mar», «23 jun – 4 jul», con el año cuando cruza años); las mesas de exámenes, una tabla con `<caption>` y `<th scope>`. Aviso de «fechas orientativas» (texto de interfaz). Estados `empty` y `unavailable` como aviso en línea (reintentar solo en `unavailable`), `error.tsx`, esqueleto claro. Mensajes en es, gn, en y pt-BR con los mismos marcadores; es sin voseo.

## 3. Criterios (Given/When/Then)

1. Given bloques activos, When se abre la página, Then se ven los semestres y la tabla del año más reciente con las fechas en el idioma de la persona.
2. Given el CMS caído, Then «no disponible» con «Intentar de nuevo»; no se muestran fechas escritas en el código.
3. Given el CMS sin bloques activos, Then «vacío» sin «Intentar de nuevo».
4. Given dos años cargados, Then solo se muestra el más reciente.
5. Given una entrada con `fin` anterior a `inicio`, When se guarda en el CMS, Then se rechaza.
6. Given la migración aplicada dos veces, Then la segunda no falla; Given filas, When `down`, Then se rechaza.
7. Given la siembra aplicada dos veces, Then la segunda omite todo; Given un bloque editado, Then no se modifica.

## 4. Fuera de alcance

Traducción del texto libre `descripcion` (el CMS no tiene localización); exportar a calendario (ICS); varios años a la vez; confirmar que las fechas sembradas sean las oficiales (**pendiente de Secretaría Académica**).
