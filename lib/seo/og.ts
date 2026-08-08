/**
 * Shared OpenGraph base fields.
 *
 * Every page that sets `openGraph` in `generateMetadata` should spread
 * `baseOg(locale)` to ensure consistent `type`, `siteName`, and `locale`
 * across all pages.
 *
 * @example
 * openGraph: {
 *   ...baseOg(locale),
 *   title: '...',
 *   description: '...',
 * }
 */

const OG_LOCALE_MAP: Record<string, string> = {
  es: 'es_PY',
  en: 'en_US',
  'pt-BR': 'pt_BR',
  gn: 'gn_PY',
}

export interface BaseOgFields {
  type: 'website'
  siteName: string
  locale: string
}

export function baseOg(locale: string): BaseOgFields {
  return {
    type: 'website',
    siteName: 'Universidad Nacional de Concepción',
    locale: OG_LOCALE_MAP[locale] ?? 'es_PY',
  }
}
