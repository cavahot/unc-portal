// FAC-05: rutas públicas de las facultades. Puro, sin red ni React.
// Qué hace: traduce el `slug` de la colección `facultades` del CMS (p. ej. «facultad-de-odontologia») a la ruta pública
// de su página (p. ej. «/facultades/odontologia»). Por qué existe: el listado, el mapa del sitio y el menú deben apuntar
// a la MISMA dirección; antes el listado enlazaba con el slug largo del CMS y caía en una página vieja distinta de la
// que enlaza el menú (contenido duplicado y dos diseños para una misma facultad).
// Amenaza que evita: construir una ruta con un valor libre del editor. Una facultad nueva sin página propia usa la ruta
// dinámica `/facultades/[slug]` con el slug codificado (`encodeURIComponent`); la lista cerrada solo contiene las seis
// páginas que existen en `app/[locale]/facultades/<ruta>/page.tsx`. Límite: si se crea una página nueva hay que sumarla
// aquí (lo recuerda tests/unit/facultades-listado.spec.ts, que compara esta lista con las carpetas).

/** Slug del CMS → segmento de la ruta pública. Lista cerrada de las páginas propias. */
export const FACULTAD_RUTA: Readonly<Record<string, string>> = {
  'facultad-de-odontologia': 'odontologia',
  'facultad-de-medicina': 'medicina',
  'facultad-de-ciencias-agrarias': 'agrarias',
  'facultad-de-ciencias-exactas-y-tecnologicas': 'ciencias-exactas',
  'facultad-de-humanidades-y-ciencias-de-la-educacion': 'humanidades',
  'facultad-de-ciencias-economicas-y-administrativas': 'ciencias-economicas',
}

/** Ruta pública (sin prefijo de idioma) de la facultad con ese slug del CMS. */
export function rutaFacultad(slug: string): string {
  const propia = Object.hasOwn(FACULTAD_RUTA, slug) ? FACULTAD_RUTA[slug] : null
  return `/facultades/${propia ?? encodeURIComponent(slug)}`
}

/** Segmento de la ruta pública si el slug del CMS tiene página propia; `null` si usa la ruta dinámica. */
export function segmentoPropio(slug: string): string | null {
  return Object.hasOwn(FACULTAD_RUTA, slug) ? FACULTAD_RUTA[slug] : null
}
