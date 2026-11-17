// SEED-PROD B2: reduce el volcado phpMyAdmin XML de WordPress a lo que leen migrate-wordpress.mjs y
// load-news-images.mjs (noticias publicadas, adjuntos, sus metadatos de imagen y su taxonomía).
// Amenaza que evita: entregar a terceros usuarios, hashes de contraseña, secretos 2FA, registros de acceso con IP,
// opciones del sitio o envíos de formularios que trae el volcado completo. Enfoque de lista permitida: toda tabla,
// tipo de entrada o clave de metadato no nombrada aquí se descarta.
// Límite: no inspecciona el texto de las noticias (si una noticia publicada contiene datos personales, ya eran públicos).

const POSTS = 'uncm1_posts'
const POSTMETA = 'uncm1_postmeta'
const TERMS = 'uncm1_terms'
const TAXONOMY = 'uncm1_term_taxonomy'
const RELATIONSHIPS = 'uncm1_term_relationships'
/** Claves de postmeta que usan los cargadores (imagen destacada, alt y ruta del archivo). */
const META_KEYS = new Set(['_thumbnail_id', '_wp_attachment_image_alt', '_wp_attached_file'])
const TAXONOMIES = new Set(['category', 'post_tag'])

const TABLE_RE = /[ \t]*<table name="([^"]+)">[\s\S]*?<\/table>\n?/g
const COL_RE = /<column name="([^"]+)">([\s\S]*?)<\/column>/g

/** Columnas de una fila sin decodificar (los valores filtrados son identificadores ASCII). */
function columns(block) {
  const cols = {}
  for (const m of block.matchAll(COL_RE)) cols[m[1]] = m[2]
  return cols
}

/** true si la fila es una noticia publicada. */
const isPublishedNews = (c) => c.post_type === 'post' && c.post_status === 'publish'
/** Una noticia protegida con contraseña no se entrega: su contenido no era público. */
const isProtected = (c) => String(c.post_password ?? '').trim() !== ''
const ALLOWED_TABLES = new Set([POSTS, POSTMETA, TERMS, TAXONOMY, RELATIONSHIPS])

/**
 * Devuelve `{ xml, counts }` con el volcado reducido. Conserva el texto de cada fila tal cual (mismas entidades y
 * formato), salvo `post_password`, que se vacía. Lanza si la entrada no es un volcado phpMyAdmin de WordPress.
 */
export function sanitizeWpXml(input) {
  const xml = String(input ?? '')
  if (!xml.includes('<pma_xml_export') || !xml.includes(`<table name="${POSTS}">`)) {
    throw new Error('El archivo no es un volcado phpMyAdmin XML de WordPress (falta la tabla uncm1_posts).')
  }
  const rows = [...xml.matchAll(TABLE_RE)].map((m) => ({ table: m[1], block: m[0], cols: columns(m[0]) }))

  const published = rows.filter((r) => r.table === POSTS && isPublishedNews(r.cols))
  const news = published.filter((r) => !isProtected(r.cols))
  const newsIds = new Set(news.map((r) => r.cols.ID))
  // Adjuntos: solo los que cuelgan de una noticia conservada o que una de ellas usa como imagen destacada.
  // Evita entregar títulos, leyendas o nombres de archivo de borradores, páginas o formularios.
  const thumbIds = new Set(
    rows.filter((r) => r.table === POSTMETA && r.cols.meta_key === '_thumbnail_id' && newsIds.has(r.cols.post_id)).map((r) => r.cols.meta_value.trim()),
  )
  const attachments = rows.filter(
    (r) => r.table === POSTS && r.cols.post_type === 'attachment' && (newsIds.has(r.cols.post_parent) || thumbIds.has(r.cols.ID)),
  )
  const posts = [...news, ...attachments]
  const postIds = new Set(posts.map((r) => r.cols.ID))
  const meta = rows.filter((r) => r.table === POSTMETA && postIds.has(r.cols.post_id) && META_KEYS.has(r.cols.meta_key))
  const taxonomy = rows.filter((r) => r.table === TAXONOMY && TAXONOMIES.has(r.cols.taxonomy))
  const ttIds = new Set(taxonomy.map((r) => r.cols.term_taxonomy_id))
  const rels = rows.filter((r) => r.table === RELATIONSHIPS && postIds.has(r.cols.object_id) && ttIds.has(r.cols.term_taxonomy_id))
  const usedTt = new Set(rels.map((r) => r.cols.term_taxonomy_id))
  const usedTaxonomy = taxonomy.filter((r) => usedTt.has(r.cols.term_taxonomy_id))
  const termIds = new Set(usedTaxonomy.map((r) => r.cols.term_id))
  const terms = rows.filter((r) => r.table === TERMS && termIds.has(r.cols.term_id))

  const kept = [...posts, ...meta, ...terms, ...usedTaxonomy, ...rels]
  const body = kept
    .map((r) => (r.table === POSTS ? r.block.replace(/<column name="post_password">[\s\S]*?<\/column>/, '<column name="post_password"></column>') : r.block))
    .join('')

  const out = `<?xml version="1.0" encoding="utf-8"?>
<!-- Extracto de noticias del volcado WordPress (SEED-PROD B2): sin usuarios, opciones, Wordfence ni esquema. -->
<pma_xml_export version="1.0" xmlns:pma="https://www.phpmyadmin.net/some_doc_url/">
    <database name="m1gr4unc_dbWP">
${body}    </database>
</pma_xml_export>
`
  // Control final de la lista permitida: si una tabla no autorizada llegara a la salida, se aborta sin escribir.
  for (const m of out.matchAll(/<table name="([^"]+)">/g)) {
    if (!ALLOWED_TABLES.has(m[1])) throw new Error(`Tabla no permitida en el extracto: ${m[1]}`)
  }
  const counts = {
    noticias: news.length,
    protegidas: published.length - news.length,
    adjuntos: attachments.length,
    postmeta: meta.length,
    terminos: terms.length,
    relaciones: rels.length,
    descartadas: rows.length - kept.length,
  }
  return { xml: out, counts }
}
