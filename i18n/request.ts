import { getRequestConfig } from 'next-intl/server'
import type { AbstractIntlMessages } from 'next-intl'
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

  const messages: AbstractIntlMessages = {}
  for (const ns of namespaces) {
    try {
      const mod = await import(`../messages/${locale}/${ns}.json`)
      // Nest under namespace key
      const parts = ns.split('.')
      let target = messages as Record<string, AbstractIntlMessages>
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {}
        target = target[parts[i]] as Record<string, AbstractIntlMessages>
      }
      target[parts[parts.length - 1]] = mod.default
    } catch {
      // fallback to es
      try {
        const mod = await import(`../messages/es/${ns}.json`)
        const parts = ns.split('.')
        let target = messages as Record<string, AbstractIntlMessages>
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) target[parts[i]] = {}
          target = target[parts[i]] as Record<string, AbstractIntlMessages>
        }
        target[parts[parts.length - 1]] = mod.default
      } catch {}
    }
  }

  return { locale, messages }
})
