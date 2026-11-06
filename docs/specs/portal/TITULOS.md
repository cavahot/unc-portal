# TITULOS — Inscripción de títulos (CMS → base de datos → portal)

Estado: **borrador para aprobación** · Rama: `feat/titulos-cms` · Alcance: solo local (el despliegue se prepara después).

## 1. Problema y evidencia (RDD)

| Hecho observado | Evidencia |
| --- | --- |
| `/titulos` tiene todo su contenido escrito en el código: 3 tipos de universidad con sus requisitos, 8 pasos del procedimiento, plazo «8–24 hs», nota del CONES, textos y enlaces. | `app/[locale]/titulos/page.tsx` (constantes `UNIVERSITY_TYPES` y `STEPS`, textos en JSX; 435 líneas). |
| El arancel «G. 200.000» está escrito a mano en la página **y además existe** en el CMS como «Inscripción de Títulos Universitarios — 200000». Hay dos fuentes y pueden divergir. | `page.tsx` (hero y franja de información) y `scripts/lib/arancelesSeedData.mjs:23`. |
| Regla del dueño: todo contenido institucional vive en CMS + Postgres y el portal lo lee de ahí, sin datos fijos ni demostración. | Memoria `feedback-todo-contenido-cms-bd-portal` (24-10-2026); patrón ya aplicado en `lib/cms/queries/aranceles.ts`. |
| La página usa una paleta distinta a la del resto del portal (fondo `slate-950`) y redacción en voseo («Identificá», «Consultá», «Mirá»). | `page.tsx` líneas 200, 277, 331, 422. |

Hipótesis (por verificar): el contenido del CMS es solo en español y las demás lenguas traducen únicamente la interfaz, como el resto de páginas; no hay localización de Payload en `payload.config.ts`.

## 2. Contrato

### 2.1 Fuente única
Un **global** del CMS `titulos-inscripcion` (un solo documento, editable sin tocar código). Un global y no una colección porque la página es un único documento con listas ordenadas (tipos y pasos) que el editor reordena en bloque.

Campos:

| Campo | Tipo | Regla |
| --- | --- | --- |
| `titulo` | texto | obligatorio, máx. 120 |
| `descripcion` | texto largo | obligatorio, máx. 400 |
| `unidad` | texto | obligatorio, máx. 120 (p. ej. «Secretaría General — UNC») |
| `plazoMinHoras`, `plazoMaxHoras` | número entero | ≥ 1 y mínimo ≤ máximo |
| `arancel` | relación a `aranceles-rectorado` | **el monto sale de esa fila**, nunca se escribe aquí (una sola fuente) |
| `notaCones` | `{ texto, url }` | `url` https de host permitido (`validateOfficialSourceUrl`) |
| `tipos[]` | lista | `slug` único, `etiqueta`, `titulo`, `subtitulo`, `acento` (**lista cerrada**: verde, azul, violeta; nunca un color libre), `requisitos[]` (texto, máx. 600), `orden` |
| `pasos[]` | lista | `responsable`, `descripcion`, orden por posición |

Acceso: lectura pública (no contiene datos privados); escritura con `canUpdateGlobal` (superadmin y web-admin), la convención de los demás globals (`Estadisticas`, `Navegacion`). Hooks: (a) revalidación por etiqueta `titulos-inscripcion` con `revalidatePortalTag`, y esa etiqueta se agrega a `ALLOWED_TAGS` de `app/api/revalidate/route.ts` (lado portal); (b) **auditoría de cambios, que es nueva**: los hooks actuales (`makeAuditAfterChange`) son de colecciones y ningún global audita hoy, así que hace falta un hook de global equivalente (SEC-027, auditoría suficiente).

### 2.2 Estados de la página
- `ok`: el global tiene al menos un tipo con requisitos y al menos un paso.
- `empty`: el global existe pero no tiene contenido publicable. Aviso neutro. **Nunca** datos de demostración.
- `unavailable`: el CMS no responde o devuelve una forma inesperada. Aviso neutro; la página no devuelve 500.
- Arancel: si la relación falta o la fila está inactiva, la tarjeta de arancel muestra «Consulte el arancel vigente en Aranceles del Rectorado» con enlace; nunca un monto inventado.

### 2.3 Textos de la interfaz
Encabezados fijos de la UI («Documentos requeridos», «Procedimiento», etc.) van en `messages/{es,gn,en,pt-BR}/pages.titulos.json`. Redacción neutra, sin voseo. El guaraní sigue el flujo de aprobación del glosario (no se publica una traducción sin revisión).

### 2.4 Datos reales de partida
Semilla idempotente `scripts/seed-titulos.mjs` con el contenido hoy publicado: 3 tipos, 8 pasos, plazo 8–24 h, nota del CONES y vínculo a la fila de arancel existente. Vuelve a ejecutarse sin duplicar ni pisar ediciones del editor.

### 2.5 Diseño
Patrón visual del portal (verdes institucionales, componentes como los de facultades), no el `slate-950` actual. Criterios: jerarquía clara (tipo de universidad → requisitos → procedimiento → plazo y arancel), contraste AA, foco visible, pasos como lista ordenada, `prefers-reduced-motion`, móvil primero. Se aplican las skills `impeccable`, `redesign-skill` y `ui-ux-pro-max`.

### 2.6 Errores capturados en el diseño (S9)
Decisión: los errores se muestran **en línea, de forma accesible y con una salida**, nunca como ventana modal que interrumpa y atrape el foco (el patrón de SweetAlert2). Es el mismo principio del middleware centralizado de errores de un servidor, aplicado a esta pila:

| Nivel | Dónde ocurre | Qué se hace |
| --- | --- | --- |
| Captura | `getTitulosInscripcion` (consulta al CMS) | `try/catch`: nunca lanza; devuelve `unavailable` o `empty`. |
| Registro | La misma consulta | `console.error` con el **nombre** del error y el código HTTP; jamás el mensaje (puede llevar la URL del CMS o credenciales). |
| Aviso al usuario | `page.tsx` | Panel en línea (`role="status"`) con «Intentar de nuevo» (vuelve a pedir la página) y «Contacto». |
| Error inesperado de render | `app/[locale]/titulos/error.tsx` | Límite de error con el estilo del portal, textos traducidos, botón «Intentar de nuevo», enlace a Contacto y solo la **referencia (`digest`)** para soporte; sin mensaje ni stack. Reporta la excepción a Sentry. |
| Escritura en el CMS | Validadores del global | Mensajes claros por campo; los rechazos de reglas son 4xx (`APIError`), no 500. |

Alternativas evaluadas: ventana modal tipo SweetAlert2 (se descarta: interrumpe y atrapa el foco para algo que no lo necesita) y avisos emergentes (toasts, Sonner, ya probado en el prototipo `/prototipos/sonner`). Los toasts quedan como alternativa documentada para confirmaciones de acciones del usuario (formularios), **pendiente de aprobación del patrón**; no se usan en esta página porque un fallo de carga no es una acción que confirmar.
Límites: el estado `unavailable` solo aparece si nunca hubo una respuesta buena (la caché de datos de Next sigue sirviendo la última). No hay `instrumentation.ts` con `onRequestError`: los errores de render del servidor llegan a Sentry por el límite de error y por la integración de Next, no por un manejador propio.

## 3. Criterios de aceptación (Given / When / Then)

1. **Given** el global con 3 tipos y 8 pasos, **When** se abre `/es/titulos`, **Then** se ven los 3 tipos con sus requisitos y los 8 pasos en orden, tomados del CMS.
2. **Given** que el editor cambia un requisito en el panel, **When** guarda, **Then** la página lo muestra tras la revalidación, sin desplegar.
3. **Given** que cambia el monto de «Inscripción de Títulos Universitarios» en Aranceles del Rectorado, **When** se recarga `/titulos`, **Then** el arancel mostrado coincide (sin editar `/titulos`).
4. **Given** el global vacío, **When** se abre la página, **Then** aparece el aviso de contenido no disponible y ningún dato de demostración.
5. **Given** que el CMS no responde, **When** se abre la página, **Then** responde 200 con aviso neutro, no 500.
6. **Given** un rol sin permiso de global (distinto de superadmin y web-admin), **When** intenta modificar el global por REST, **Then** recibe 403.
7. **Given** un `acento` fuera de la lista o una URL de CONES con host no permitido, **When** se intenta guardar, **Then** se rechaza.
8. **Given** que el CMS no responde y nunca hubo una respuesta buena, **When** se abre `/titulos`, **Then** se ve un aviso en línea con «Intentar de nuevo» y «Contacto», sin ventana modal, y el fallo queda registrado sin secretos.
9. **Given** un error inesperado al pintar la página, **When** ocurre, **Then** se muestra el límite de error del portal con una referencia para soporte y sin mensaje ni stack del error.

## 4. Pruebas (TDD)
Esquema y acceso del global; validadores (plazo, URL, acento); consulta con estados `ok`/`empty`/`unavailable`; render de la página por estado; relación al arancel; semilla idempotente; revalidación por etiqueta; ausencia de datos fijos en `page.tsx` (prueba que falla si reaparecen `UNIVERSITY_TYPES`, `STEPS` o `200.000`).

## 5. Fuera de alcance
`/legalizaciones` (369 líneas), `/tramites` y `/solicitar-titulo` también tienen contenido fijo; son candidatos para el mismo patrón en una tarea aparte. No se despliega a producción en esta tarea.

## 6. Riesgos, orden de despliegue y reversión
- **Orden obligatorio al desplegar:** migración → semilla → portal. Si el portal sale antes que la semilla, `/titulos` mostrará el estado `empty` hasta cargar los datos.
- La migración es solo hacia adelante (patrón del repo); la página anterior queda en git.
- Riesgo de relación: si alguien desactiva la fila de arancel, la tarjeta cae al aviso con enlace, no a un monto.
