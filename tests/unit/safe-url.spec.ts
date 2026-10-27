// DEP-15 (Frente A): pruebas de `safeHref` y del uso obligatorio en componentes con URL del CMS.
// Amenaza: enlace `javascript:`/`data:` introducido por un editor (o cuenta editorial comprometida)
// que ejecuta código en el origen del portal al hacer clic. Límite: no cubre atributos `src`.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { safeHref } from '@/lib/security/safeUrl'
import RichText from '@/components/RichText'
import RichTextBlock from '@/components/blocks/RichText'

const ROOT = path.resolve(__dirname, '..', '..')

describe('safeHref: payloads adversariales -> #', () => {
  const hostile: Array<[string, unknown]> = [
    ['mayúsculas mezcladas', 'JaVaScRiPt:alert(1)'],
    ['tab dentro del esquema', 'java\tscript:alert(1)'],
    ['salto de línea dentro del esquema', 'java\nscript:alert(1)'],
    ['espacio inicial', ' javascript:alert(1)'],
    ['control inicial', '\u0001javascript:alert(1)'],
    ['entidad decimal', '&#106;avascript:alert(1)'],
    ['entidad hex', '&#x6A;avascript:alert(1)'],
    ['data html', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
    ['protocolo relativo', '//evil.com'],
    ['barra + backslash', '/\\evil.com'],
    ['doble backslash', '\\\\evil.com'],
    ['relativo sin barra', 'contacto'],
    ['vacío', ''],
    ['solo espacios', '   '],
    ['undefined', undefined],
    ['null', null],
    ['número', 123],
    ['objeto', {}],
    ['muy largo', 'https://x.py/' + 'a'.repeat(3000)],
    ['NUL embebido', 'https://x.py/\u0000javascript:'],
  ]
  it.each(hostile)('%s', (_n, input) => {
    expect(safeHref(input)).toBe('#')
  })
})

describe('safeHref: URLs válidas se conservan', () => {
  it.each([
    ['https://unc.edu.py/x?a=1', 'https://unc.edu.py/x?a=1'],
    ['HTTP://x.py', 'HTTP://x.py'],
    ['mailto:a@unc.edu.py', 'mailto:a@unc.edu.py'],
    ['tel:+595123', 'tel:+595123'],
    ['/noticias/x', '/noticias/x'],
    ['/', '/'],
    ['#seccion', '#seccion'],
    ['  https://unc.edu.py  ', 'https://unc.edu.py'],
  ])('%s', (input, out) => {
    expect(safeHref(input)).toBe(out)
  })
})

describe('serializadores Lexical con enlace hostil', () => {
  const linkNode = (url: string) => ({
    type: 'link',
    url,
    tag: 'a',
    children: [{ type: 'text', text: 'clic', format: 0 }],
  })
  const doc = (url: string) => ({
    root: { type: 'root', children: [{ type: 'paragraph', children: [linkNode(url)] }] },
  })

  it('components/RichText.tsx (noticias) neutraliza javascript:', () => {
    const html = renderToStaticMarkup(React.createElement(RichText, { content: doc('javascript:alert(1)') as any }))
    expect(html.toLowerCase()).not.toContain('javascript:')
    expect(html).toContain('href="#"')
  })
  it('components/blocks/RichText.tsx (Page Builder) neutraliza javascript:', () => {
    const html = renderToStaticMarkup(React.createElement(RichTextBlock, { content: doc('JaVaScRiPt:alert(1)') as any }))
    expect(html.toLowerCase()).not.toContain('javascript:')
    expect(html).toContain('href="#"')
  })
  it('conservan enlaces https legítimos', () => {
    const a = renderToStaticMarkup(React.createElement(RichText, { content: doc('https://unc.edu.py') as any }))
    const b = renderToStaticMarkup(React.createElement(RichTextBlock, { content: doc('https://unc.edu.py') as any }))
    expect(a).toContain('href="https://unc.edu.py"')
    expect(b).toContain('href="https://unc.edu.py"')
  })
})

// --- Uso obligatorio (estático) -------------------------------------------------------------
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

/** Extrae las expresiones `href={...}` admitiendo un nivel de `${}` anidado. */
function hrefExpressions(src: string): string[] {
  const re = /href=\{((?:[^{}]|\{[^{}]*\})*)\}/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push(m[1])
  return out
}

// Campos que sabemos que vienen del CMS: ninguna excepción puede usarlos en un href.
const CMS_URL_FIELD = /(driveUrl|cvUrl|linkHref|urlPdf|urlOjs|ctaUrl|buttonUrl|externalUrl|fileUrl|formUrl|\bc.url|\bel.url|\bnode.url|\burl\b)/

// DEP-19b: excepciones documentadas. Cada archivo pone en `href` solo datos que él mismo define
// (listas literales, constantes, rutas calculadas): no hay origen CMS. `cmsImport` marca el único caso
// que importa consultas del CMS (la portada) y lo hace para noticias, cuyos enlaces se arman con `/noticias/${slug}`.
const STATIC_DATA_EXCEPTIONS: Record<string, { reason: string; cmsImport?: boolean }> = {
  'app/[locale]/contacto/page.tsx': { reason: 'maps/tel/mailto fijos definidos en el archivo' },
  'app/[locale]/contacto/dependencias/page.tsx': { reason: 'directorio de dependencias literal en el archivo (web/maps)' },
  'app/[locale]/informacion-publica/page.tsx': { reason: 'canales con href literal en el archivo' },
  'app/[locale]/institucional/page.tsx': { reason: 'tarjetas institucionales con href literal' },
  'app/[locale]/mapa-sitio/page.tsx': { reason: 'mapa del sitio literal' },
  'app/[locale]/noticias/page.tsx': { reason: 'paginación `?page=N` calculada con enteros; importa getNews pero no pone campos del CMS en href', cmsImport: true },
  'app/[locale]/page.tsx': { reason: 'accesos rápidos y transparencia literales; las noticias usan `/noticias/${slug}`', cmsImport: true },
  'components/institutional/InstitutionalAccessSection.tsx': { reason: 'accesos institucionales literales' },
  'components/layout/LocaleSwitcher.tsx': { reason: '`pathname` del router de next-intl, no del CMS' },
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/')

/**
 * DEP-19b: devuelve los `href={...}` no literales que no pasan por safeHref, para un fuente dado.
 * Exportado como función local para poder probar el propio escáner con fuentes sintéticas.
 */
function findUnsafeHrefs(src: string): string[] {
  const out: string[] = []
  for (const expr of hrefExpressions(src)) {
    const e = expr.trim()
    // Rutas internas por plantilla o literales fijos no provienen del CMS.
    if (/^`(\/|mailto:|tel:|#|\?)/.test(e) || /^'[^']*'$/.test(e) || /^"[^"]*"$/.test(e)) continue
    if (e.includes('safeHref(')) continue
    // Identificador local asignado desde safeHref en el mismo archivo (p. ej. `const href = safeHref(...)`).
    if (/^[A-Za-z_]\w*$/.test(e) && src.includes(`const ${e} = safeHref(`)) continue
    out.push(e)
  }
  return out
}

describe('uso obligatorio de safeHref en href con datos del CMS', () => {
  const files = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components'))]

  it('el escáner detecta href de origen CMS sin safeHref (prueba negativa del propio test)', () => {
    expect(findUnsafeHrefs('<a href={node.url}>x</a>')).toEqual(['node.url'])
    expect(findUnsafeHrefs('<a href={item.href}>x</a>')).toEqual(['item.href'])
    expect(findUnsafeHrefs('<a href={safeHref(item.href)}>x</a>')).toEqual([])
    expect(findUnsafeHrefs("const h = safeHref(u); <a href={h}>x</a>")).toEqual([])
    expect(findUnsafeHrefs('<a href={`/noticias/${slug}`}>x</a>')).toEqual([])
  })

  it('el escaneo cubre app/ y components/ completos (no una lista)', () => {
    expect(files.length).toBeGreaterThan(40)
    expect(files.map(rel)).toContain('components/navigation/MegaMenu.tsx')
    expect(files.map(rel)).toContain('components/pages/AcademicSectionPage.tsx')
  })

  it('ningún href no literal evita safeHref salvo excepciones documentadas', () => {
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      const unsafe = findUnsafeHrefs(src)
      if (unsafe.length === 0) continue
      if (rel(f) in STATIC_DATA_EXCEPTIONS) continue
      for (const e of unsafe) offenders.push(`${rel(f)}: href={${e}}`)
    }
    expect(offenders).toEqual([])
  })

  it('las excepciones siguen siendo vigentes y no consumen datos del CMS en el href', () => {
    for (const [file, info] of Object.entries(STATIC_DATA_EXCEPTIONS)) {
      const src = readFileSync(path.join(ROOT, file), 'utf8')
      const unsafe = findUnsafeHrefs(src)
      // Excepción obsoleta: si el archivo ya no la necesita se retira de la lista.
      expect(unsafe.length, `${file}: excepción sin href pendiente`).toBeGreaterThan(0)
      expect(info.reason.length).toBeGreaterThan(10)
      if (!info.cmsImport) {
        expect(src, `${file} no debe importar datos del CMS`).not.toMatch(/@unc\/cms-types|@\/lib\/cms\//)
      }
      for (const e of unsafe) {
        expect(CMS_URL_FIELD.test(e), `${file}: href={${e}} parece un campo URL del CMS`).toBe(false)
      }
    }
  })

  it.each([
    'components/RichText.tsx',
    'components/blocks/RichText.tsx',
    'components/faq/FAQAccordion.tsx',
    'components/institutional/DocumentCard.tsx',
    'components/institutional/ThesisCard.tsx',
    'components/institutional/JournalCard.tsx',
    'components/tramites/FacultadTabs.tsx',
    'components/institutional/ExternalCTA.tsx',
    'components/blocks/CTA.tsx',
    'components/blocks/Hero.tsx',
    'components/tribunal/TribunalAcordeonClient.tsx',
    // CNV-01: reemplaza a ConveniosTabsClient.tsx.
    'components/convenios/ConveniosBrowser.tsx',
  ])('%s importa y usa safeHref', (rel) => {
    const src = readFileSync(path.join(ROOT, rel), 'utf8')
    expect(src).toMatch(/from '@\/lib\/security\/safeUrl'/)
    expect(src).toContain('safeHref(')
  })
})
