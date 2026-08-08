/**
 * lib/seo/jsonld.ts
 * Type-safe JSON-LD schema builders for structured data.
 *
 * Usage: call the builder, then render the result with:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.unc.edu.py'
const SITE_NAME = 'Universidad Nacional de Concepción'

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
