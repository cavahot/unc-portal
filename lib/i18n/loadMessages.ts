// DEP-15 (Frente C): cargador de mensajes i18n con fallback POR ARCHIVO a `es`.
// Evidencia RDD: RDD-DEP-25. Spec: docs/specs/deploy/DEP-15-frontend-enlaces-404-i18n.md.
import type { AbstractIntlMessages } from 'next-intl'

/** Locale de respaldo cuando falta el archivo de un namespace en otro idioma (lo lee `guard-i18n-parity`). */
export const I18N_FALLBACK_LOCALE = 'es'

/** Importa `messages/<locale>/<ns>.json`; en la app real envuelve `import()` dinámico. */
export type MessageImporter = (locale: string, namespace: string) => Promise<{ default: unknown }>

/**
 * Carga los namespaces de un locale y los anida por puntos
 * (`pages.facultades.humanidades` -> `messages.pages.facultades.humanidades`).
 * Si el archivo del locale no existe usa el de `es`; si tampoco existe lo omite.
 *
 * Amenaza que evita: una página sin traducción (p. ej. `/en/ley-5189`) rompe
 * con MISSING_MESSAGE o tumba el render. Límite: el respaldo es POR ARCHIVO; si
 * el archivo del locale existe pero le falta una clave, next-intl sigue
 * mostrando MISSING_MESSAGE. No inventa traducciones: el texto mostrado es el
 * de `es` (deuda editorial, reportada por el guard como informativa).
 */
export async function loadMessages(
  locale: string,
  namespaces: readonly string[],
  importer: MessageImporter,
): Promise<AbstractIntlMessages> {
  const messages: AbstractIntlMessages = {}

  /** Inserta `content` en la ruta anidada del namespace. */
  const place = (ns: string, content: unknown) => {
    const parts = ns.split('.')
    let target = messages as Record<string, AbstractIntlMessages>
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {}
      target = target[parts[i]] as Record<string, AbstractIntlMessages>
    }
    target[parts[parts.length - 1]] = content as AbstractIntlMessages
  }

  for (const ns of namespaces) {
    try {
      place(ns, (await importer(locale, ns)).default)
    } catch {
      try {
        place(ns, (await importer(I18N_FALLBACK_LOCALE, ns)).default)
      } catch {
        // Ausente también en `es`: se omite; el consumidor verá la clave faltante.
      }
    }
  }
  return messages
}
