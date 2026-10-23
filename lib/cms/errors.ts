export class CmsError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'CmsError';
    this.status = status;
  }
}

/**
 * DEP-15: true solo si el CMS respondió 404 (el recurso no existe). Permite que
 * las consultas de detalle devuelvan `null` y la página responda un 404 legítimo.
 * Límite: no mira el mensaje ni el cuerpo; solo `CmsError.status === 404`.
 */
export function isCmsNotFound(error: unknown): boolean {
  return error instanceof CmsError && error.status === 404;
}

/**
 * DEP-15: true para cualquier fallo que NO sea «no existe»: red caída, timeout,
 * 5xx, 401/403 de configuración o error inesperado. Amenaza que evita: tratar
 * una caída transitoria del CMS como 404 y cachearla con `revalidate`. Estos
 * errores deben propagarse para que Next no cachee la página como inexistente.
 */
export function isCmsOutage(error: unknown): boolean {
  return !isCmsNotFound(error);
}

/**
 * DEP-15: los datos demo/fallback solo se permiten en desarrollo local. En
 * producción (y en test) una caída del CMS no se enmascara con contenido de
 * demostración. Límite: depende de NODE_ENV, fijado por Next en build/run.
 */
export function demoFallbackAllowed(): boolean {
  return process.env.NODE_ENV === 'development';
}
