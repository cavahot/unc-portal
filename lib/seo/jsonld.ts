/**
 * lib/seo/jsonld.ts
 * Type-safe JSON-LD schema builders for structured data.
 *
 * Usage: call the builder, then render the result with:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.unc.edu.py'
const SITE_NAME = 'Universidad Nacional de Concepción'

// ---------------------------------------------------------------------------
// Serialización segura (DEP-05)
// ---------------------------------------------------------------------------

/** Secuencias \uXXXX para los caracteres que el helper neutraliza. */
const JSONLD_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

/**
 * Serializa un esquema JSON-LD para incrustarlo en un <script type="application/ld+json">.
 * Amenaza que evita: XSS almacenado; JSON.stringify no escapa `<`, así que un título del
 * CMS con `</script><script>…` cerraría el bloque e inyectaría HTML (también neutraliza
 * `<!--` y `]]>`, y U+2028/2029 que rompen literales en parsers antiguos).
 * Equivalencia: los caracteres reemplazados solo aparecen dentro de cadenas JSON, por lo que
 * JSON.parse(salida) es igual a JSON.parse(JSON.stringify(valor)).
 * Valores no serializables (nunca lanza, para no tumbar el render por datos de SEO):
 * undefined/función/símbolo en la raíz -> "null"; BigInt -> cadena decimal;
 * referencia circular u otro fallo -> "null" (oculta el error: los datos del CMS son JSON plano).
 * Límite: solo protege el contexto <script type="application/ld+json">; NO sirve para
 * atributos HTML ni como sanitizador general. No sustituye la CSP (SEC-10/DEP-16). Ref: DEP-05.
 */
export function safeJsonLd(value: unknown): string {
  let json: string | undefined
  try {
    json = JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  } catch {
    return 'null'
  }
  if (typeof json !== 'string') return 'null'
  return json.replace(/[<>&\u2028\u2029]/g, (c) => JSONLD_ESCAPES[c])
}

// ---------------------------------------------------------------------------
// Organization / EducationalOrganization
// ---------------------------------------------------------------------------

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: 'UNC Paraguay',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/logo.png`,
      width: 200,
      height: 60,
    },
    image: `${SITE_URL}/images/logo.png`,
    description:
      'Universidad pública del Paraguay fundada en 2007, con sede en Concepción. Ofrece carreras de grado y postgrado en ciencias de la salud, exactas, humanidades, ciencias económicas y agrarias.',
    foundingDate: '2007',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ruta PY12 Km 9',
      addressLocality: 'Concepción',
      addressRegion: 'Concepción',
      addressCountry: 'PY',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@unc.edu.py',
      availableLanguage: ['Spanish'],
    },
    sameAs: [
      'https://www.facebook.com/UNConcepcion',
      'https://twitter.com/UNConcepcion',
      'https://www.unc.edu.py',
    ],
  }
}

// ---------------------------------------------------------------------------
// WebSite (enables sitelinks search box in Google)
// ---------------------------------------------------------------------------

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'es-PY',
  }
}

// ---------------------------------------------------------------------------
// NewsArticle
// ---------------------------------------------------------------------------

interface NewsArticleInput {
  title: string
  description?: string | null
  slug: string
  publishedAt?: string | null
  author?: string | null
  imageUrl?: string | null
  locale?: string
}

export function buildNewsArticleSchema(article: NewsArticleInput) {
  const url = `${SITE_URL}/${article.locale && article.locale !== 'es' ? article.locale + '/' : ''}noticias/${article.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${url}#article`,
    headline: article.title.slice(0, 110), // Google limit
    description: article.description ?? undefined,
    url,
    ...(article.imageUrl
      ? {
          image: {
            '@type': 'ImageObject',
            url: article.imageUrl,
          },
        }
      : {}),
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.publishedAt ?? undefined,
    author: {
      '@type': 'Organization',
      name: article.author ?? SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    inLanguage: 'es-PY',
  }
}

// ---------------------------------------------------------------------------
// BreadcrumbList
// ---------------------------------------------------------------------------

interface BreadcrumbItem {
  name: string
  url: string
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

interface CourseInput {
  name: string
  description?: string | null
  slug: string
  provider?: string | null
  duration?: string | null
  mode?: string | null
}

export function buildCourseSchema(course: CourseInput) {
  const url = `${SITE_URL}/carreras/${course.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${url}#course`,
    name: course.name,
    description: course.description ?? undefined,
    url,
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
    },
    ...(course.duration ? { timeRequired: course.duration } : {}),
    ...(course.mode
      ? {
          courseMode: course.mode.toLowerCase().includes('virtual')
            ? 'online'
            : 'onsite',
        }
      : {}),
    inLanguage: 'es-PY',
    educationalLevel: 'university',
  }
}
