// SEC-09 / DEP-04: única fuente de verdad de la ruta del panel de Payload (`routes.admin`).
// Evita enlaces hardcodeados a `/admin` que dan 404 cuando el panel vive en otra ruta.
// Módulo puro (sin imports de servidor): lo usan componentes cliente y payload.config.ts.
export const ADMIN_ROUTE = '/accesoSeguro' as const

// Compone una URL dentro del panel; `path` debe empezar con "/" (p. ej. '/portal') o ir vacío.
export const adminPath = (path = ''): string => `${ADMIN_ROUTE}${path}`
