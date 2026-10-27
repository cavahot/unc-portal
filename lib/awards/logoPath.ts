// PRA-02: validación en el portal de rutas de logo provenientes del CMS (espejo de
// apps/cms/src/utilities/validators.ts, que las valida al guardar).

/** Carpetas de `public/images/` permitidas para logos de la sección de premios y acreditaciones. */
export type LogoFolder = 'facultades' | 'reconocimientos'

/**
 * Devuelve la ruta si es `/images/<carpeta>/<nombre>.<png|jpg|jpeg|webp>` con nombre alfanumérico,
 * `_` o `-`; en cualquier otro caso `undefined` (el componente muestra iniciales o nada).
 * PRA-02. Amenaza que evita: path traversal, URL externa (hotlink que el CSP bloquea de todos modos),
 * esquemas `javascript:`/`data:`, SVG y carpetas ajenas llegando a un `src` desde datos del CMS
 * (por ejemplo, un registro escrito antes de existir el validador del panel).
 * Límite: no comprueba que el archivo exista en disco.
 */
export function safeLogoPath(value: unknown, folder: LogoFolder): string | undefined {
  if (typeof value !== 'string') return undefined
  return new RegExp(`^/images/${folder}/[A-Za-z0-9_-]+\\.(png|jpe?g|webp)$`).test(value) ? value : undefined
}
