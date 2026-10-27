// MLG-01: funciones puras de la página /marco-legal (spec docs/specs/portal/MARCO-LEGAL.md §2 y §4).
// Amenazas: (1) publicar un enlace a un host no permitido o con esquema peligroso (hotlink, phishing, XSS);
// (2) mostrar filas sin enlace o con categoría desconocida; (3) una búsqueda que no encuentre «Ética» al
// escribir «etica» (accesibilidad cognitiva). Límite: sin red ni Payload; la verificación en vivo es aparte.
import { describe, expect, it } from 'vitest'
import {
  ALLOWED_DOCUMENT_HOSTS,
  CATEGORY_ORDER,
  detectFormat,
  filterGroups,
  groupByCategory,
  isAllowedDocumentUrl,
  mapLegalDocuments,
  normalizeSearchText,
  splitTitulo,
  type LegalDocument,
} from '@/lib/cms/marcoLegal'

const resolveFile = (url: unknown) => (typeof url === 'string' && url.startsWith('/api/media/file/') ? `http://localhost:3002${url}` : null)

const raw = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Estatuto UNC',
  category: 'estatuto',
  externalUrl: 'https://drive.google.com/file/d/abc/view',
  order: 1,
  ...over,
})

const doc = (over: Partial<LegalDocument> = {}): LegalDocument => ({
  id: 1,
  title: 'Doc',
  category: 'politicas',
  description: null,
  nota: null,
  href: 'https://drive.google.com/file/d/x/view',
  format: 'drive',
  estado: 'vigente',
  fechaDocumento: null,
  order: 1,
  ...over,
})

describe('MLG-01: allowlist de URLs de documentos', () => {
  it('declara exactamente los cuatro hosts acordados', () => {
    expect([...ALLOWED_DOCUMENT_HOSTS].sort()).toEqual(['docs.google.com', 'drive.google.com', 'unc.edu.py', 'www.unc.edu.py'])
  })

  it.each([
    'https://drive.google.com/file/d/1I0rEzgzZcOFulmBzOrc9JHEC2oltTY68/view',
    'https://docs.google.com/document/d/x/edit',
    'https://www.unc.edu.py/wp-content/uploads/x.pdf',
    'https://unc.edu.py/x.pdf',
  ])('acepta %s', (url) => {
    expect(isAllowedDocumentUrl(url)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'http://drive.google.com/file/d/x/view',
    'https://evil.example/x.pdf',
    'https://drive.google.com.evil.example/x',
    'https://evil.example/?u=https://drive.google.com',
    'https://user:pw@drive.google.com/x',
    '//drive.google.com/x',
    ' https://drive.google.com/x',
    '',
    null,
    42,
  ])('rechaza %s', (url) => {
    expect(isAllowedDocumentUrl(url)).toBe(false)
  })
})

describe('MLG-01: detectFormat', () => {
  it.each([
    [{ filename: 'estatuto.PDF' }, 'pdf'],
    [{ mimeType: 'application/pdf' }, 'pdf'],
    [{ filename: 'reglamento.docx' }, 'doc'],
    [{ mimeType: 'application/msword' }, 'doc'],
    [{ filename: 'aranceles.xlsx' }, 'xls'],
    [{ mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, 'xls'],
    [{ url: 'https://drive.google.com/file/d/x/view' }, 'drive'],
    [{ url: 'https://docs.google.com/document/d/x/edit' }, 'drive'],
    [{ url: 'https://www.unc.edu.py/wp-content/uploads/a.pdf' }, 'pdf'],
    [{ url: 'https://www.unc.edu.py/marco-legal/' }, 'link'],
    [{}, 'link'],
  ] as const)('%j → %s', (input, expected) => {
    expect(detectFormat(input)).toBe(expected)
  })
})

describe('MLG-01: mapLegalDocuments', () => {
  it('prioriza el archivo subido sobre la URL externa y detecta su formato', () => {
    const [d] = mapLegalDocuments(
      [raw({ file: { url: '/api/media/file/estatuto.pdf', filename: 'estatuto.pdf', mimeType: 'application/pdf' } })],
      resolveFile,
    )
    expect(d.href).toBe('http://localhost:3002/api/media/file/estatuto.pdf')
    expect(d.format).toBe('pdf')
  })

  it('usa la URL externa permitida cuando no hay archivo', () => {
    const [d] = mapLegalDocuments([raw()], resolveFile)
    expect(d.href).toBe('https://drive.google.com/file/d/abc/view')
    expect(d.format).toBe('drive')
    expect(d.estado).toBe('vigente')
  })

  it('cae a la URL externa si el archivo no resuelve a una URL segura', () => {
    const [d] = mapLegalDocuments([raw({ file: { url: 'https://evil.example/x.pdf', filename: 'x.pdf' } })], resolveFile)
    expect(d.href).toBe('https://drive.google.com/file/d/abc/view')
  })

  it('descarta filas sin enlace válido, con host no permitido, sin título o con categoría desconocida', () => {
    const out = mapLegalDocuments(
      [
        raw({ id: 1, externalUrl: null }),
        raw({ id: 2, externalUrl: 'https://evil.example/x.pdf' }),
        raw({ id: 3, externalUrl: 'javascript:alert(1)' }),
        raw({ id: 4, title: '   ' }),
        raw({ id: 5, category: 'secreto' }),
        raw({ id: 6 }),
      ],
      resolveFile,
    )
    expect(out.map((d) => d.id)).toEqual([6])
  })

  it('normaliza estado, fecha y nota; un estado desconocido cuenta como vigente', () => {
    const [a, b] = mapLegalDocuments(
      [
        raw({ id: 1, estado: 'derogado', fechaDocumento: '2019-05-02T00:00:00.000Z', nota: ' Reemplazado por la V2 ' }),
        raw({ id: 2, estado: 'otro', fechaDocumento: 'no-es-fecha', nota: '' }),
      ],
      resolveFile,
    )
    expect(a).toMatchObject({ estado: 'derogado', fechaDocumento: '2019-05-02', nota: 'Reemplazado por la V2' })
    expect(b).toMatchObject({ estado: 'vigente', fechaDocumento: null, nota: null })
  })

  it('no lanza con entradas basura', () => {
    expect(mapLegalDocuments(null as never, resolveFile)).toEqual([])
    expect(mapLegalDocuments([null, 'x', 3] as never, resolveFile)).toEqual([])
  })
})

describe('MLG-01: groupByCategory', () => {
  it('sigue el orden canónico, omite categorías vacías y ordena por order y luego título', () => {
    const groups = groupByCategory([
      doc({ id: 1, category: 'politicas', order: 2, title: 'B' }),
      doc({ id: 2, category: 'estatuto', order: 9, title: 'E' }),
      doc({ id: 3, category: 'politicas', order: 2, title: 'Á' }),
      doc({ id: 4, category: 'ley-creacion', order: 1, title: 'L' }),
      doc({ id: 5, category: 'politicas', order: 1, title: 'Z' }),
    ])
    expect(groups.map((g) => g.category)).toEqual(['ley-creacion', 'estatuto', 'politicas'])
    expect(groups[2].docs.map((d) => d.id)).toEqual([5, 3, 1])
  })

  it('el orden canónico tiene las 10 categorías sin repetir', () => {
    expect(new Set(CATEGORY_ORDER).size).toBe(10)
  })
})

describe('MLG-01: búsqueda', () => {
  it('normaliza tildes, mayúsculas, comillas y espacios', () => {
    expect(normalizeSearchText('  Código de ÉTICA  «UNC» ')).toBe('codigo de etica unc')
    expect(normalizeSearchText('Régimen   Académico')).toBe('regimen academico')
  })

  const groups = groupByCategory([
    doc({ id: 1, category: 'reglamento-general', title: 'Reglamento General UNC: Título VII «De las becas y ayudas económicas»' }),
    doc({ id: 2, category: 'codigos', title: 'Código de Ética UNC' }),
    doc({ id: 3, category: 'codigos', title: 'Código de Buen Gobierno UNC', description: 'Transparencia y ética pública' }),
    doc({ id: 4, category: 'planes', title: 'Plan de Comunicación UNC', nota: 'Incluye becas de difusión' }),
  ])

  it('una consulta vacía devuelve todo', () => {
    const r = filterGroups(groups, '   ')
    expect(r.matched).toBe(4)
    expect(r.total).toBe(4)
    expect(r.groups).toHaveLength(3)
  })

  it('busca sin tildes en título, descripción y nota, y quita grupos vacíos', () => {
    const r = filterGroups(groups, 'ETICA')
    expect(r.matched).toBe(2)
    expect(r.groups.map((g) => g.category)).toEqual(['codigos'])
    expect(filterGroups(groups, 'becas').matched).toBe(2)
  })

  it('todas las palabras deben aparecer (AND), en cualquier orden', () => {
    expect(filterGroups(groups, 'unc etica').matched).toBe(2)
    expect(filterGroups(groups, 'becas reglamento').matched).toBe(1)
  })

  it('sin coincidencias devuelve cero grupos', () => {
    const r = filterGroups(groups, 'zzzqqq')
    expect(r.matched).toBe(0)
    expect(r.groups).toEqual([])
  })
})

describe('MLG-01: splitTitulo (títulos del Reglamento General)', () => {
  it('separa el número romano y el nombre del título', () => {
    expect(splitTitulo('Reglamento General UNC: Título I «De la naturaleza, fines y composición de la Universidad»')).toEqual({
      numeral: 'I',
      heading: 'De la naturaleza, fines y composición de la Universidad',
    })
    expect(splitTitulo('Reglamento General UNC: Título XII «De los mecanismos de selección»')?.numeral).toBe('XII')
  })

  it('tolera la errata de comillas del título VI del sitio publicado', () => {
    expect(splitTitulo('Reglamento General UNC: Título VI » Del Régimen Disciplinario»')).toEqual({
      numeral: 'VI',
      heading: 'Del Régimen Disciplinario',
    })
  })

  it('devuelve null para títulos sin esa forma', () => {
    expect(splitTitulo('Estatuto UNC')).toBeNull()
    expect(splitTitulo('Título sin numeral')).toBeNull()
  })
})
