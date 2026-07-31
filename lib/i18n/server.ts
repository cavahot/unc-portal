import { createTranslator, createFormatter, type AbstractIntlMessages } from 'next-intl'

const NAMESPACES = [
  'common', 'nav', 'accessibility',
  'pages.home', 'pages.noticias', 'pages.buscar',
  'pages.transparencia', 'pages.revistas', 'pages.biblioteca',
  'pages.solicitar-titulo', 'pages.informacion-publica',
  'pages.carreras', 'pages.facultades', 'pages.contacto',
  'pages.institucional',
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

export async function getT(locale: string, namespace: string) {
  const messages = await loadMessages(locale)
  return createTranslator({ locale, messages: messages as unknown as IntlMessages, namespace: namespace as Parameters<typeof createTranslator>[0]['namespace'] })
}

export async function getF(locale: string) {
  return createFormatter({ locale, timeZone: 'America/Asuncion' })
}
