import { createTranslator, createFormatter, type AbstractIntlMessages } from 'next-intl'
import { applyApprovedGuaraniDictionary, getApprovedGuaraniDictionary } from './guaraniDynamic'

const NAMESPACES = [
  'common', 'nav', 'accessibility',
  'pages.home', 'pages.noticias', 'pages.buscar',
  'pages.transparencia', 'pages.revistas', 'pages.biblioteca',
  'pages.solicitar-titulo', 'pages.informacion-publica',
  'pages.carreras', 'pages.facultades', 'pages.contacto',
  'pages.institucional',
  'pages.historia', 'pages.mision-vision', 'pages.marco-legal', 'pages.ley-5189', 'pages.ley-5282',
  'pages.autoridades', 'pages.organigrama', 'pages.titulos',
  'pages.legalizaciones', 'pages.convenios', 'pages.tribunal-electoral',
  'pages.investigacion', 'pages.extension', 'pages.calendario-academico',
  // PILARES-01: textos de las páginas /docencia, /investigacion y /extension (el contenido viene del CMS).
  'pages.pilares',
  // Secciones académicas: textos de la plantilla compartida y contenido de las tres páginas con texto propio.
  'pages.contacto-dependencias', 'pages.estados','pages.preguntas-frecuentes', 'pages.seccion-academica', 'pages.aseguramiento-calidad', 'pages.bienestar-institucional', 'pages.direccion-general-academica',
  'pages.mapa-sitio', 'pages.privacidad', 'pages.accesibilidad',
  'pages.tramites',
  // ARR-01: /aranceles-rectorado pasa a getT (como /marco-legal) para formatear en el servidor por idioma.
  'pages.aranceles-rectorado',
]

export async function loadMessages(locale: string): Promise<AbstractIntlMessages> {
  const messages: Record<string, unknown> = {}
  for (const ns of NAMESPACES) {
    let mod: { default: unknown } | undefined
    try {
      mod = await import(`../../messages/${locale}/${ns}.json`)
    } catch {
      try {
        mod = await import(`../../messages/es/${ns}.json`)
      } catch { /* skip */ }
    }
    if (!mod) continue
    const parts = ns.split('.')
    let cursor = messages as Record<string, unknown>
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cursor[parts[i]]) cursor[parts[i]] = {}
      cursor = cursor[parts[i]] as Record<string, unknown>
    }
    cursor[parts[parts.length - 1]] = mod.default
  }
  if (locale === 'gn') {
    // Solo se actualizan etiquetas que todavía son idénticas al español; las frases traducidas siguen siendo editoriales.
    const [messagesEs, dictionary] = await Promise.all([loadMessages('es'), getApprovedGuaraniDictionary()])
    return applyApprovedGuaraniDictionary(messages as AbstractIntlMessages, messagesEs, dictionary)
  }
  return messages as AbstractIntlMessages
}

// Return type uses `string` key to avoid MessageKeys strict-typing conflicts
// when namespace is not a precise literal. Keys are validated at runtime via JSON files.
export async function getT(locale: string, namespace: string): Promise<(key: string, values?: Record<string, string | number | Date | undefined>) => string> {
  const messages = await loadMessages(locale)
  const t = createTranslator({ locale, messages: messages as unknown as IntlMessages, namespace: namespace as any }) as any
  return (key: string, values?: Record<string, string | number | Date | undefined>): string =>
    t(key as any, values as any)
}

export async function getF(locale: string) {
  return createFormatter({ locale, timeZone: 'America/Asuncion' })
}
