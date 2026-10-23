# TASK-SEC-001 — Endurecer seguridad y permisos del Portal Institucional UNC

**Estado:** Propuesto; ninguna corrección aplicada.  
**Alcance:** portal Next.js y CMS Payload de este repositorio.  
**Responsable:** sin asignar. **Fechas:** sin definir.  
**Base:** revisión estática del código local y ejecución de pruebas del 16-10-2026. No se verificó el despliegue ni se hizo pentest. Antes de cada cambio, confirmar configuración de producción y respaldo de datos.

## Objetivo y criterio de cierre

Impedir lectura anónima de borradores, publicación/acciones administrativas fuera del rol autorizado, escritura falsificada de auditoría y exposición por dependencias vulnerables. **No publicar una nueva versión** hasta que el CMS compile, lint y pruebas de autorización negativas pasen en un entorno aislado, y exista un plan de reversión probado. Una alerta de dependencia requiere analizar aplicabilidad; no demuestra explotación.

## Línea base observada (no sustituye una nueva corrida al implementar)

- `npm test` en raíz: 10/10 pruebas pasaron; `npm run typecheck` de portal: pasó.
- `npm run lint` en raíz: falló (`next lint` ya no es un comando válido en este proyecto).
- `npm run lint --workspace=@unc/cms`: falló por configuración ESLint circular.
- `tsc --noEmit -p apps/cms/tsconfig.json`: falló por imports relativos, módulo faltante y errores de tipos.
- `npm audit --omit=dev --json`: 30 entradas (2 críticas, 17 altas, 11 moderadas). Instalado: `next@16.2.12`, `payload@3.87.1`, `@payloadcms/storage-s3@3.87.1`.
- Rama local `main` tenía `test_write.txt` no versionado. **No tocarlo**.

## Orden de ejecución — subtareas listas para abrir como issues

### SEC-00 · Preparar entorno seguro y baseline [bloqueante]

- **Resultado:** rama de trabajo y staging aislado; respaldo/restauración de DB y objetos comprobados; nunca ejecutar seed, migraciones o E2E sobre producción por accidente.
- **Acciones:** registrar commit/lockfile/configuración no secreta; verificar qué versión corre realmente en producción (podría diferir de la carpeta local); definir variables y base de prueba; volver a correr auditoría de dependencias y guardar salida de CI.
- **Aceptación:** backups restaurables; Git sin cambios ajenos incorporados; existe una instrucción reproducible para compilar/probar sin credenciales de producción.
- **Fuente:** `package.json`, `apps/cms/package.json`, informe de auditoría local.

### SEC-01 · Actualizar dependencias expuestas [P0; depende de SEC-00]

- **Resultado:** Next y todos los paquetes Payload alineados en versiones corregidas; lockfile coherente.
- **Acciones:** evaluar GHSA-p293-qw3h-jr36 y GHSA-2xp9-vwfh-vxw4 (Next), GHSA-vc4h-q48j-5hcx (Payload) y GHSA-7vg8-29qx-jgj8 (storage S3), entre las demás entradas de `npm audit`. El 16-10-2026 el auditor propuso Next 16.4.2 y varios Payload 3.91.0; **revalidar al ejecutar**. No usar `npm audit fix --force` indiscriminadamente.
- **Aceptación:** `npm audit --omit=dev` sin riesgos críticos/altos no justificados; build y pruebas en staging; uploads, autenticación y migraciones smoke probados; rollback documentado.
- **Fuente:** `next.config.mjs:30-33`, `package.json`, `apps/cms/package.json`.

### SEC-02 · Impedir lectura pública de borradores [P0; depende de SEC-00]

- **Resultado:** anónimo solo ve documentos realmente publicados; revisores autorizados ven borradores según política.
- **Acciones:** reemplazar `read: () => true` en `noticias` y `paginas` por restricción de `_status: published` para anónimo; definir lectura de versiones y modo preview. Revisar si `approvalStatus` debe ser condición adicional y cómo tratar registros heredados sin `_status`.
- **Aceptación:** REST, GraphQL y `draft=true` anónimos nunca devuelven borradores ni versiones; rol autorizado accede solo a lo aprobado; el portal sigue mostrando noticias/páginas publicadas.
- **Fuente:** `apps/cms/src/collections/Noticias.ts:18-23,232-235`, `Paginas.ts:17-22,67-70`; documentación oficial de Payload sobre Drafts y Access Control.

### SEC-03 · Aprobar matriz de permisos y transiciones [P0; decisión funcional]

- **Resultado:** una tabla aprobada `rol × recurso × leer/crear/editar/borrar × transición editorial` que sirva de contrato para código y pruebas.
- **Propuesta, NO decisión tomada:** `viewer` lectura limitada; `correspondent/editor` redactan; `reviewer` revisa/aprueba sin publicar; `publisher` publica solo aprobado; `web-admin` administra contenido institucional; `superadmin` administra usuarios. Precisar rol `auditor` y quién lee logs/alertas/estadísticas.
- **Conflicto documental a resolver antes de codificar:** `docs/FLUJO_EDITORIAL.md:18-35,94-115` asigna aprobar/rechazar al `reviewer`, también permite aprobar/publicar al `publisher`, y dice que publica el `editor`. Esa documentación no coincide con la propuesta anterior y es internamente ambigua respecto de quién puede publicar. El Product Owner debe decidir una única política por rol/estado; no escogerla por inferencia ni por cómo funcionan hoy los botones.
- **Aceptación:** Product Owner aprueba matriz y casos excepcionales (autorrevisión, reversión, estados, usuarios de unidad); se actualiza `docs/FLUJO_EDITORIAL.md` para que no contradiga la política aprobada; pruebas negativas se derivan de ella.
- **Fuente:** `apps/cms/src/access/roles.ts`, `collections/Users.ts`, `Noticias.ts`, `Paginas.ts`, `docs/FLUJO_EDITORIAL.md`.

### SEC-04 · Imponer flujo editorial e historial en servidor [P0; depende de SEC-03]

- **Resultado:** nadie publica, aprueba ni altera el rastro editorial solo manipulando la API.
- **Acciones:** aplicar reglas de transición de `approvalStatus` y `_status` en backend; proteger campos sensibles; escribir `approvalHistory` desde servidor a partir de identidad autenticada y hora confiable; diferenciar creación de borrador vs publicación.
- **Aceptación:** editor/correspondent no pueden aprobar/publicar; reviewer no puede publicar; publisher no publica si no está aprobado; historial no es editable por cliente; rechazos 403/422 y auditables; pruebas REST/GraphQL además de UI.
- **Fuente:** `apps/cms/src/access/roles.ts:126-131`, `collections/Noticias.ts:25-41,232-245`, `collections/Paginas.ts:49-70`, `fields/approvalHistory.ts`.

### SEC-05 · Cerrar rutas administrativas y auditoría [P1; depende de SEC-03]

- **Resultado:** rutas de logs/auditoría/métricas/alertas autorizadas por función; eventos de auditoría solo creados por servidor.
- **Acciones:** exigir roles explícitos en `app/api/{alerts,logs,auditoria,metrics,dashboard}/...`; prohibir `create` de `auditoria` desde API de clientes; preservar historial y definir retención; verificar límites/paginación. Ajustar `Users.access.admin` según matriz sin confiar en la URL `/accesoSeguro`.
- **Aceptación:** viewer/editor no cambian umbrales ni resuelven alertas; no pueden leer logs internos si matriz lo prohíbe; nadie falsifica `usuario`, `rol` o `accion` en auditoría; superadmin autorizado conserva acceso.
- **Fuente:** `apps/cms/src/middleware.ts:38-99`, `collections/Auditoria.ts:15-19`, `collections/Users.ts:35-44`, `app/api/alerts/route.ts:50-81`.

### SEC-06 · Aplicar ACL en consultas Local API [P1; depende de SEC-03 y SEC-05]

- **Resultado:** el `payload.find/count/findByID` de rutas autenticadas respeta permisos efectivos o aplica selección explícita segura.
- **Acciones:** revisar todas las rutas propias; pasar `overrideAccess: false` y contexto de usuario/req en operaciones dependientes del solicitante; mantener excepciones internas justificadas y documentadas. No inferir permisos del CORS.
- **Aceptación:** rutas no revelan borradores, comentarios de aprobación ni registros protegidos a roles sin permiso; tests con anónimo y cada rol; la API pública del portal sigue funcionando.
- **Fuente:** `apps/cms/src/app/api/auditoria/route.ts:34-40`, `dashboard/noticias/route.ts:20-29`, `metrics/route.ts:16-67`; Payload Docs, Local API Access Control.

### SEC-07 · Cubrir `/api/*` realmente y robustecer límites [P1; depende de SEC-00]

- **Resultado:** políticas de API se ejecutan, con rate limiting detrás de proxy confiable; CORS queda separado de autenticación.
- **Acciones:** reconciliar `proxy.ts` y su `matcher` (hoy excluye `api/`); aplicar protección en handlers para no depender solo de proxy; identificar proxy confiable para IP; evaluar store compartido para contacto; añadir control de tamaño de solicitudes. En `apps/cms/src/middleware.ts`, no tratar `Origin` vacío como prueba de servidor autorizado.
- **Aceptación:** test de matcher para `/api/contact`, `/api/preview`, `/api/revalidate`, rutas públicas y estáticos; tests de 429 sin poder eludir por encabezado IP controlado por cliente; 401/403 por rol sin importar `Origin`.
- **Fuente:** `proxy.ts:48-73,96-113,147-151`, `app/api/contact/route.ts:4-35`, `apps/cms/src/middleware.ts`.

### SEC-08 · Eliminar password fallback en seeds [P1; independiente]

- **Resultado:** ningún seed crea superadmin con credencial conocida.
- **Acciones:** exigir variable segura o abortar con error; impedir ejecución accidental en producción; determinar si alguna instalación accesible recibió cuenta sembrada y, si corresponde, rotar credenciales e invalidar sesiones.
- **Aceptación:** sin variable, seed falla antes de escribir; con variable en staging crea cuenta solo allí; búsqueda automática no detecta passwords por defecto en scripts nuevos.
- **Fuente:** `apps/cms/scripts/seed/init.ts:19-38`, `payload-direct.ts:22-38`.

### SEC-09 · Reparar build, lint y pruebas del CMS [P1; depende de SEC-00; antes del merge]

- **Resultado:** quality gates ejecutables y verdes con DB de prueba aislada.
- **Acciones:** corregir imports relativos y dependencias ausentes; `payload.count()` devuelve objeto, no número; corregir tipos de `health` y opciones; reemplazar `next lint` y reparar configuración ESLint CMS; actualizar E2E de `/admin`/3000 a `/accesoSeguro`/3002 sin tocar datos reales.
- **Aceptación:** typecheck y lint de ambos workspaces, unitarias, integración y E2E aisladas pasan; CI los ejecuta; no se ocultan errores con `any` o exclusiones amplias.
- **Fuente:** `package.json:9-14`, `apps/cms/package.json:13-18`, `apps/cms/src/app/api/dashboard/stats/route.ts:16-58`, `apps/cms/tests/e2e/admin.e2e.spec.ts:21-38`, `apps/cms/src/payload.config.ts:47-50`.

### SEC-10 · Revisar publicación de adjuntos, datos estructurados y preview [P2; depende de SEC-03]

- **Resultado:** archivos y fichas no publicados no son públicos; JSON-LD seguro; previsualización no expone secreto reutilizable.
- **Acciones:** revisar `tribunal-documentos` con `active=false`, `tesis` y `media` (incluido bucket público S3); separar material público/confidencial; serializar JSON-LD escapando `<`; reemplazar secreto global en query por mecanismo de vida corta o sesión y revisar logs/historial.
- **Aceptación:** pruebas anónimas solo reciben material declarado público; tests de serialización HTML con texto adversarial; enlace preview caduca y no confiere acceso general.
- **Fuente:** `collections/TribunalDocumentos.ts`, `Tesis.ts`, `Media.ts`, `payload.config.ts:179-185`, `app/[locale]/carreras/[slug]/page.tsx:49-67`, `app/api/preview/route.ts`.

### SEC-11 · Gate final de seguridad y despliegue [bloqueante; depende de SEC-01..10]

- **Resultado:** decisión consciente de release basada en evidencia reproducible.
- **Aceptación:** matriz de permisos aprobada; pruebas negativas de REST/GraphQL/Local API/panel por rol; portal+CMS build y lint; audit de dependencias triado; staging con DB sintética; respaldo y rollback probados; no secretos en reporte; responsable firma el go/no-go. Si una subtarea se difiere, registrar riesgo y responsable explícitamente.

## Por dónde empezar ahora

**SEC-00 y SEC-01**, en una rama separada, porque las dependencias tienen avisos graves. En paralelo, **SEC-02** para cerrar la lectura pública de borradores. **Antes de escribir los permisos editoriales de SEC-04/05/06, aprobar SEC-03**: el código no debe inventar quién revisa, aprueba y publica. La suite de CMS actualmente fallida (SEC-09) es un bloqueo de merge/release aunque las correcciones de seguridad sean correctas.

## GitHub

No se requiere acceso a GitHub para usar este task: el archivo queda **solo en la copia local**. Si se decide publicarlo como issue(s), comprobar duplicados y permisos y pedir confirmación del destino antes de crear registros remotos. No incluir secretos, datos de usuarios ni adjuntos reales en issues públicos.
