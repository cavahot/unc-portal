import { getRequestConfig } from 'next-intl/server'
import { loadMessages } from '../lib/i18n/loadMessages'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  // Load all namespace files for this locale
  const namespaces = [
    'common',
    'nav',
    'accessibility',
    'pages.home',
    'pages.noticias',
    'pages.buscar',
    'pages.transparencia',
    'pages.revistas',
    'pages.biblioteca',
    'pages.solicitar-titulo',
    'pages.informacion-publica',
    'pages.carreras',
    'pages.facultades',
    'pages.contacto',
    'pages.institucional',
    'pages.historia',
    'pages.mision-vision',
    'pages.marco-legal',
    'pages.ley-5189',
    'pages.ley-5282',
    'pages.autoridades',
    'pages.organigrama',
    'pages.titulos',
    'pages.legalizaciones',
    'pages.convenios',
    'pages.tribunal-electoral',
    'pages.investigacion',
    'pages.extension',
    'pages.calendario-academico',
    'pages.mapa-sitio',
    'pages.privacidad',
    'pages.accesibilidad',
    'pages.tramites',
    'pages.facultades.odontologia',
    'pages.facultades.medicina',
    'pages.facultades.agrarias',
    'pages.facultades.humanidades',
    'pages.facultades.ciencias-exactas',
    'pages.facultades.ciencias-economicas',
    'pages.aranceles-rectorado',
  ]

  // DEP-15: la carga con fallback por archivo a `es` vive en lib/i18n/loadMessages.ts (probada en
  // tests/unit/i18n-fallback.spec.ts). El `import()` queda aquí para que el bundler vea la ruta.
  const messages = await loadMessages(locale, namespaces, (loc, ns) => import(`../messages/${loc}/${ns}.json`))

  return { locale, messages }
})
