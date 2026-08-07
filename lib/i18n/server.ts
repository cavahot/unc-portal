import { createTranslator, createFormatter, type AbstractIntlMessages } from 'next-intl'

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
  'pages.mapa-sitio', 'pages.privacidad', 'pages.accesibilidad',
  'pages.tramites',
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
  return messages as AbstractIntlMessages
}

// Return type uses `string` key to avoid MessageKeys strict-typing conflicts
// when namespace is not a precise literal. Keys are validated at runtime via JSON files.
export async function getT(locale: string, namespace: string): Promise<(key: string, values?: Record<string, string | number | Date | undefined>) => string> {
  const messages = await loadMessages(locale)
  const t = createTranslator({ locale, messages: messages as unknown as IntlMessages, namespace: namespace as Parameters<typeof createTranslator>[0]['namespace'] })
  return (key: string, values?: Record<string, string | number | Date | undefined>): string =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t(key as any, values as any)
}

export async function getF(locale: string) {
  return createFormatter({ locale, timeZone: 'America/Asuncion' })
}
