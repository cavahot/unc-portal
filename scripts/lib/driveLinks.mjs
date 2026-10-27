/**
 * CNV-01: normalización de los enlaces «Descargar» del sitio anterior a enlaces de Google Drive.
 * Spec: docs/specs/portal/CONVENIOS.md §3.2 | Evidencia: RDD-CNV-05.
 *
 * Qué hace: recibe el href EXACTO del HTML de origen (o null si la fila no tiene enlace) y devuelve el motivo y,
 * si corresponde, el enlace canónico:
 *   - `ok`                -> https://drive.google.com/file/d/<ID>/view (también desde /open?id= y /uc?id=).
 *   - `ok-href-pegado`    -> el href trae dos URL pegadas; se usa el primer id (el que abre el navegador).
 *   - `carpeta`           -> /drive/folders/<ID>: se conserva como carpeta y se marca para revisión.
 *   - `host-no-permitido` -> otro dominio (p. ej. el servidor antiguo softcon.wnpower.host): sin enlace.
 *   - `sin-enlace`        -> la fila no tiene ancla «Descargar»: sin enlace.
 * Por qué: solo Drive está en la allowlist del CMS; un enlace a un host ajeno o roto no se migra (amenaza:
 * publicar con la marca UNC un enlace que ya no controla la institución). Límite: no comprueba que el archivo
 * exista ni que sea público (eso lo hace la comprobación de disponibilidad, fuera del repositorio).
 */

const ID = '[A-Za-z0-9_-]{10,}'

/** @param {string | null | undefined} href */
export function normalizeDriveHref(href) {
  if (!href) return { status: 'sin-enlace', url: null, fileId: null, folderId: null }
  let parsed
  try {
    parsed = new URL(href)
  } catch {
    return { status: 'host-no-permitido', url: null, fileId: null, folderId: null }
  }
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'drive.google.com') {
    return { status: 'host-no-permitido', url: null, fileId: null, folderId: null }
  }
  const glued = (href.match(/https?:\/\//g) ?? []).length > 1
  const file = href.match(new RegExp(`^https://drive\\.google\\.com/file/d/(${ID})`))
  const byQuery = /^\/(open|uc)$/.test(parsed.pathname) ? parsed.searchParams.get('id') : null
  const fileId = file?.[1] ?? (byQuery && new RegExp(`^${ID}$`).test(byQuery) ? byQuery : null)
  if (fileId) {
    return { status: glued ? 'ok-href-pegado' : 'ok', url: `https://drive.google.com/file/d/${fileId}/view`, fileId, folderId: null }
  }
  const folder = href.match(new RegExp(`^https://drive\\.google\\.com/drive/(?:u/\\d+/)?folders/(${ID})`))
  if (folder) return { status: 'carpeta', url: `https://drive.google.com/drive/folders/${folder[1]}`, fileId: null, folderId: folder[1] }
  return { status: 'host-no-permitido', url: null, fileId: null, folderId: null }
}
