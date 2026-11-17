// SEED-PROD B2: el volcado phpMyAdmin de WordPress trae usuarios, hashes, secretos 2FA, registros de accesos con IP y
// opciones del sitio. Antes de entregarlo al desarrollador se reduce a lo que leen migrate-wordpress y
// load-news-images. Amenaza: filtrar credenciales o datos personales. Límite: no revisa el texto de las noticias.
import { describe, expect, it } from 'vitest'
import { sanitizeWpXml } from '../../scripts/lib/wpExportNoticias.mjs'
import { parseAttachmentTexts, parseTableRows, parseWpPosts } from '../../scripts/lib/mediaLoader.mjs'

const row = (table: string, cols: Record<string, string>) =>
  `        <table name="${table}">\n${Object.entries(cols).map(([k, v]) => `            <column name="${k}">${v}</column>`).join('\n')}\n        </table>\n`

const post = (ID: string, type: string, status: string, extra: Record<string, string> = {}) =>
  row('uncm1_posts', { ID, post_author: '2', post_date: '2024-05-02 10:00:00', post_title: `T${ID}`, post_status: status, post_password: '', post_name: `p-${ID}`, post_type: type, guid: `https://www.unc.edu.py/wp-content/uploads/2024/05/i${ID}.jpg`, ...extra })

const FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<pma_xml_export version="1.0" xmlns:pma="https://www.phpmyadmin.net/some_doc_url/">
    <pma:structure_schemas>
        <pma:database name="db"><pma:table name="uncm1_users">CREATE TABLE x</pma:table></pma:database>
    </pma:structure_schemas>
    <database name="m1gr4unc_dbWP">
${post('1', 'post', 'publish')}${post('2', 'post', 'draft')}${post('3', 'page', 'publish')}${post('4', 'attachment', 'inherit')}${post('6', 'post', 'publish', { post_password: 'clave-de-entrada', post_title: 'Noticia protegida' })}${post('7', 'attachment', 'inherit', { post_parent: '2', post_title: 'adjunto-de-borrador' })}${post('8', 'attachment', 'inherit', { post_parent: '1', post_title: 'adjunto-de-noticia' })}${post('5', 'flamingo_inbound', 'publish', { post_title: 'persona@example.invalid' })}${row('uncm1_postmeta', { meta_id: '1', post_id: '1', meta_key: '_thumbnail_id', meta_value: '4' })}${row('uncm1_postmeta', { meta_id: '2', post_id: '4', meta_key: '_wp_attachment_image_alt', meta_value: 'Alt de prueba' })}${row('uncm1_postmeta', { meta_id: '3', post_id: '1', meta_key: '_edit_lock', meta_value: '123:2' })}${row('uncm1_postmeta', { meta_id: '4', post_id: '2', meta_key: '_thumbnail_id', meta_value: '4' })}${row('uncm1_terms', { term_id: '7', name: 'Noticias', slug: 'noticias' })}${row('uncm1_terms', { term_id: '8', name: 'Menu', slug: 'menu' })}${row('uncm1_term_taxonomy', { term_taxonomy_id: '7', term_id: '7', taxonomy: 'category' })}${row('uncm1_term_taxonomy', { term_taxonomy_id: '8', term_id: '8', taxonomy: 'nav_menu' })}${row('uncm1_term_relationships', { object_id: '1', term_taxonomy_id: '7' })}${row('uncm1_term_relationships', { object_id: '3', term_taxonomy_id: '7' })}${row('uncm1_users', { ID: '2', user_login: 'admin', user_pass: '$P$Bhashdeprueba', user_email: 'admin@example.invalid' })}${row('uncm1_usermeta', { umeta_id: '1', user_id: '2', meta_key: 'session_tokens', meta_value: 'x' })}${row('uncm1_options', { option_id: '1', option_name: 'siteurl', option_value: 'https://www.unc.edu.py' })}${row('uncm1_wfls_2fa_secrets', { id: '1', user_id: '2', secret: 'SECRETO2FA' })}${row('uncm1_wflogins', { id: '1', IP: '10.0.0.9', username: 'admin' })}    </database>
</pma_xml_export>
`

describe('sanitizeWpXml: solo lo que necesitan las noticias', () => {
  const { xml, counts } = sanitizeWpXml(FIXTURE)

  it('no conserva usuarios, hashes, 2FA, accesos, opciones ni el esquema', () => {
    for (const s of ['uncm1_users', 'uncm1_usermeta', 'uncm1_options', 'uncm1_wf', '$P$', 'SECRETO2FA', '10.0.0.9', 'admin@example.invalid', 'structure_schemas', 'CREATE TABLE']) {
      expect(xml).not.toContain(s)
    }
  })

  it('conserva noticias publicadas y adjuntos; descarta borradores, páginas y otros tipos', () => {
    const ids = parseTableRows(xml, 'uncm1_posts').map((p) => p.ID).sort()
    expect(ids).toEqual(['1', '4', '8'])
    expect(xml).not.toContain('persona@example.invalid')
  })

  it('excluye noticias protegidas con contraseña y las informa', () => {
    expect(xml).not.toContain('clave-de-entrada')
    expect(xml).not.toContain('Noticia protegida')
    expect(counts.protegidas).toBe(1)
  })

  it('adjuntos: solo los de noticias conservadas (por padre o por imagen destacada)', () => {
    expect(xml).not.toContain('adjunto-de-borrador')
    expect(xml).toContain('adjunto-de-noticia')
  })

  it('la salida solo nombra las cinco tablas permitidas', () => {
    const tables = new Set([...xml.matchAll(/<table name="([^"]+)">/g)].map((m) => m[1]))
    expect([...tables].sort()).toEqual(['uncm1_postmeta', 'uncm1_posts', 'uncm1_term_relationships', 'uncm1_term_taxonomy', 'uncm1_terms'])
  })

  it('postmeta: solo claves de imagen de filas conservadas', () => {
    const meta = parseTableRows(xml, 'uncm1_postmeta').map((m) => `${m.post_id}:${m.meta_key}`).sort()
    expect(meta).toEqual(['1:_thumbnail_id', '4:_wp_attachment_image_alt'])
  })

  it('taxonomía: solo categorías/etiquetas de noticias conservadas', () => {
    expect(parseTableRows(xml, 'uncm1_term_taxonomy').map((t) => t.taxonomy)).toEqual(['category'])
    expect(parseTableRows(xml, 'uncm1_terms').map((t) => t.name)).toEqual(['Noticias'])
    expect(parseTableRows(xml, 'uncm1_term_relationships').map((r) => r.object_id)).toEqual(['1'])
  })

  it('los cargadores leen el resultado igual que el original para lo que usan', () => {
    // Única diferencia admitida: la noticia protegida con contraseña (p-6) no se entrega.
    expect(parseWpPosts(xml)).toEqual(parseWpPosts(FIXTURE).filter((p: { slug: string }) => p.slug !== 'p-6'))
    // El adjunto del borrador (i7) se excluye a propósito; el resto de los textos alternativos se conserva igual.
    const { '2024/05/i7.jpg': _omitido, ...esperado } = parseAttachmentTexts(FIXTURE)
    expect(parseAttachmentTexts(xml)).toEqual(esperado)
  })

  it('informa los conteos', () => {
    expect(counts).toMatchObject({ noticias: 1, adjuntos: 2, postmeta: 2, descartadas: expect.any(Number) })
  })

  it('rechaza un archivo que no es un volcado phpMyAdmin de WordPress', () => {
    expect(() => sanitizeWpXml('<html></html>')).toThrow(/phpMyAdmin/)
  })
})
