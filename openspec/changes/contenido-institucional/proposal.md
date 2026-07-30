# Proposal: contenido-institucional

**Change ID:** contenido-institucional
**Date:** 2026-07-29
**Status:** draft

---

## 1. Problema

Cinco secciones institucionales siguen viviendo en el WordPress viejo: Transparencia (Ley 5189/14 y Ley 5282/14), Revistas UNC, Biblioteca Digital/Tesis, Solicitud de Títulos y Solicitud de Información Pública.

- **Riesgo legal**: las Leyes 5189/2014 y 5282/2014 obligan a la UNC a publicar información pública. Si el WordPress se apaga antes de migrar, la universidad queda en incumplimiento.
- **Costo operativo**: hoy actualizar un enlace requiere entrar al WordPress viejo; no hay un único punto de administración.
- **Inconsistencia**: tablas verdes de WordPress vs. el sistema de diseño verde oscuro del portal nuevo.

Todo el contenido es **enlaces externos** (Google Drive, OJS, PDFs). No hay carga de archivos a MinIO — eso desbloquea la migración sin depender del blocker de S3.

---

## 2. Solución propuesta

| Sección | Ruta | Modelo Payload | Razón |
|---|---|---|---|
| Transparencia | `/transparencia` | **Global** `transparencia` | Lista de estructura fija, ~1 actualización/año, se edita como una unidad |
| Revistas UNC | `/revistas` | **Colección** `revistas` | Muchos registros, alta independiente, imagen de portada |
| Biblioteca Digital | `/biblioteca` | **Colección** `tesis` | Muchos registros, requiere búsqueda y paginación |
| Solicitud de Títulos | `/solicitar-titulo` | Página estática + URL en Global `enlacesExternos` | Solo CTA a Google Form |
| Información Pública | `/informacion-publica` | Página estática + `mailto:` en Global | Texto legal + contacto |

Todas las páginas son **Server Components** con `cmsFetch` + tags de revalidación. Cero JS de cliente salvo el input de búsqueda de `/biblioteca` (que es un `<form method="GET">`, igual que `/buscar`).

### Por qué Global y no Colección para Transparencia

Los ítems de cada ley no tienen ciclo de vida propio: no tienen slug, no se publican por separado, no se buscan, no se enlazan individualmente. Un Global con dos arrays (`ley5189`, `ley5282`) le da al editor **una sola pantalla** con drag-and-drop para reordenar, un solo tag de revalidación y una sola entrada en el menú del admin. Una colección de 27 documentos obligaría al editor a navegar una lista paginada para cambiar una URL, y exigiría un campo `orden` manual.

Contrapartida aceptada: sin versionado por ítem y sin edición concurrente segura del array. Con ~1 actualización anual y un solo administrador central, es irrelevante.

---

## 3. Modelos de datos

### Global `transparencia`

```
ley5189: array (max 20)
  label: text (required)
  url:   text (optional — algunos ítems aún no tienen documento)
  nota:  text (optional)
ley5282: array (max 30)
  label: text (required)
  url:   text (optional)
  nota:  text (optional)
```

`url` es **opcional a propósito**: la Ley 5282 tiene 17 ítems y varios todavía no tienen documento cargado. La UI debe renderizar esos ítems como "Documento pendiente" en lugar de ocultarlos — la ley obliga a listar la categoría, no a tenerla completa.

### Colección `revistas`

```
nombre: text (required)
slug: text (auto, unique)
descripcion: textarea (required)
anioInicio: number (required)
urlOjs: text (required)
portada: upload -> media (optional)
activa: checkbox (default true)
```

### Colección `tesis`

```
titulo: text (required)
autor: text (required)
anio: number (required)
resumen: textarea (optional)
facultad: select (required)
urlPdf: text (required)
```

### Global `enlacesExternos`

```
formularioTitulos: text (URL del Google Form)
emailInformacionPublica: email
```

Evita hardcodear la URL del Google Form: si Rectorado cambia el formulario, el editor lo cambia en el admin sin deploy.

---

## 4. Flujos de usuario

**Ciudadano busca información pública**
```
Footer/menú → /transparencia → ve dos bloques (Ley 5189 / Ley 5282)
  → card con ícono de documento → clic → abre Google Drive en pestaña nueva
  → ítem sin URL → card atenuada "Documento pendiente" (no clickeable)
```

**Investigador busca una tesis**
```
/biblioteca → escribe "agronomía" → GET /biblioteca?q=agronomia
  → Server Component filtra por título/autor vía where[or]
  → card con autor, año, facultad → "Descargar PDF" → URL externa
  → sin resultados → empty state con sugerencia de limpiar la búsqueda
```

**Egresado solicita su título**
```
/solicitar-titulo → lee requisitos y pasos → CTA "Iniciar solicitud"
  → abre el Google Form en pestaña nueva
```

**Editor actualiza Transparencia**
```
Admin → Globals → Transparencia → edita URL del ítem → Guardar
  → hook afterChange → revalidatePortalTag('transparencia')
  → /transparencia refleja el cambio sin deploy
```

---

## 5. Capabilities

### New Capabilities
- `transparencia`: publicación de los índices de información pública exigidos por las Leyes 5189/14 y 5282/14
- `revistas`: directorio de revistas académicas con enlace al OJS externo
- `biblioteca-digital`: catálogo de tesis con búsqueda por título y autor
- `solicitudes-institucionales`: páginas de solicitud de títulos e información pública con destinos externos configurables

### Modified Capabilities
- `navegacion`: agregar las cinco rutas nuevas al menú y/o al footer

---

## 6. Áreas afectadas

| Área | Impacto | Descripción |
|---|---|---|
| `apps/cms/src/globals/Transparencia.ts` | New | Global con arrays por ley |
| `apps/cms/src/globals/EnlacesExternos.ts` | New | URLs de formularios externos |
| `apps/cms/src/collections/Revistas.ts` | New | Colección de revistas |
| `apps/cms/src/collections/Tesis.ts` | New | Colección de tesis |
| `apps/cms/src/payload.config.ts` | Modified | Registrar 2 colecciones + 2 globals |
| `apps/cms/src/payload-types.ts` | Modified | Regenerar con `generate:types` |
| `lib/cms/queries/institutional.ts` | New | `getTransparencia`, `getRevistas`, `getTesis`, `getEnlacesExternos` |
| `app/transparencia/`, `app/revistas/`, `app/biblioteca/`, `app/solicitar-titulo/`, `app/informacion-publica/` | New | 5 rutas Server Component |
| `components/` | New | `DocumentCard`, `JournalCard`, `ThesisCard`, `ExternalCTA` |
| `app/api/revalidate/` | Modified | Aceptar los tags nuevos |

---

## 7. Scope

### In scope
- 2 globals + 2 colecciones en Payload, con labels en español
- 5 rutas del portal en Server Components, diseño verde oscuro con cards
- Búsqueda por título/autor en `/biblioteca` vía `<form method="GET">`
- Tags de revalidación por sección y hooks `afterChange`
- Seed inicial: 10 ítems Ley 5189 + 17 ítems Ley 5282 con las URLs actuales del WordPress
- Enlaces desde navegación y footer
- Estados vacíos y fallback silencioso cuando el CMS no responde

### Out of scope
- Migración de noticias del WordPress (cambio aparte)
- Deploy en servidor / Docker producción
- Carga de archivos a MinIO para estas secciones (todo es enlace externo)
- Formulario propio de solicitud de títulos (se mantiene el Google Form)
- Búsqueda full-text avanzada, facetas o filtros combinados en `/biblioteca`
- Integración con la API del OJS (solo enlaces salientes)
- Indexar tesis y revistas en el buscador global `/buscar`

---

## 8. Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Enlaces de Google Drive rotos o con permisos privados | Media | Verificar cada URL durante el seed; campo `nota` para aclarar estado |
| `site-settings` no está registrado en `payload.config.ts` pero `lib/cms/queries/settings.ts` ya lo consulta | Alta | No replicar el patrón: registrar todo global nuevo en la config en el mismo commit |
| Volumen de tesis crece y `/biblioteca` se vuelve lento | Media | Paginación desde el día uno (`limit=12`) y `sort=-anio` |
| Editor rompe el orden del array de Transparencia | Baja | `maxRows` y seed documentado como referencia para restaurar |
| Falta claridad legal sobre qué ítems deben mostrarse aunque no tengan documento | Media | Renderizar siempre el ítem con estado "pendiente" (interpretación conservadora) |

---

## 9. Plan de rollback

1. Revertir el commit del portal → las 5 rutas devuelven 404, el resto del portal no se ve afectado (rutas nuevas, sin cambios en las existentes).
2. Revertir `payload.config.ts` → los globals y colecciones desaparecen del admin. Las tablas Postgres quedan huérfanas pero inertes; se eliminan con una migración de limpieza si el rechazo es definitivo.
3. Restaurar los links del menú/footer al WordPress viejo mientras siga en línea.

Sin migración destructiva: este cambio solo agrega tablas y rutas.

---

## 10. Dependencias

- Payload CMS v3 corriendo con Postgres (ya operativo)
- URLs reales de los 27 ítems de transparencia y del listado de revistas (las provee Rectorado / Secretaría)
- El WordPress viejo debe seguir accesible hasta terminar el seed, como fuente de las URLs

---

## 11. Criterios de éxito

- [ ] `/transparencia` lista los 10 ítems de Ley 5189 y los 17 de Ley 5282, con enlaces que abren en pestaña nueva
- [ ] Un ítem sin URL se muestra como "Documento pendiente" y no es clickeable
- [ ] `/revistas` lista las revistas desde el CMS con enlace al OJS
- [ ] `/biblioteca?q=autor` filtra tesis por título y autor; sin resultados muestra empty state
- [ ] `/solicitar-titulo` e `/informacion-publica` toman sus destinos del CMS, no del código
- [ ] Un editor cambia una URL en el admin y el portal la refleja sin deploy
- [ ] Las 5 páginas son Server Components (sin `"use client"` salvo el input de búsqueda)
- [ ] `tsc --noEmit` pasa sin errores nuevos
- [ ] Ninguna sección requiere subir archivos a MinIO
