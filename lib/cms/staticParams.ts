// DEP-15: envoltorio para generateStaticParams.

/**
 * Ejecuta la carga de parámetros estáticos y devuelve `[]` si lanza.
 * Amenaza que evita: un CMS caído durante el build tumba `next build` (o deja
 * un build a medias) solo por no poder listar slugs. Con `[]` las rutas se
 * generan bajo demanda (`dynamicParams = true`). Límite: oculta el error tras un
 * `console.error`; no reintenta ni distingue la causa.
 */
export async function safeStaticParams<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error('[generateStaticParams] CMS no disponible; se omite la prerenderización:', error);
    return [];
  }
}
