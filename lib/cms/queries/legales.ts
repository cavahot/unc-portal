// INST-08: consultas de /privacidad y /accesibilidad con estados explícitos. Spec docs/specs/portal/LEGALES.md §2.6.
// Qué hace: lee el global del CMS en el idioma de la persona y devuelve el estado de la lectura:
//  - `ok`: hay contenido válido; `fallback` es verdadero si el idioma pedido no tenía texto y se usó el español.
//  - `empty`: el CMS respondió sin contenido válido (ni en el idioma ni en español).
//  - `unavailable`: el CMS no respondió o respondió algo inesperado: aviso con «Intentar de nuevo».
// Por qué `fallback-locale=none` y un segundo pedido en español: el respaldo automático de Payload no dice si usó el español,
// y un texto legal en otro idioma sin avisar podría confundirse con su traducción.
// Límite: nunca lanza; registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS).
import { cmsFetch } from '@/lib/cms/client'
import { CmsError } from '@/lib/cms/errors'
import {
  mapDeclaracionAccesibilidad,
  mapPoliticaPrivacidad,
  type DeclaracionAccesibilidadData,
  type PoliticaPrivacidadData,
} from '@/lib/cms/legales'

export type LegalResult<T> = { status: 'ok'; data: T; fallback: boolean } | { status: 'empty' } | { status: 'unavailable' }

/** Idiomas que el CMS conoce; cualquier otro valor se pide como español (no llega tal cual a la URL del CMS). */
const CMS_LOCALES = new Set(['es', 'en', 'pt-BR', 'gn'])
/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal son las etiquetas. */
const SAFETY_REVALIDATE_SECONDS = 3600

function detail(error: unknown): string {
  return error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
}

async function leer<T>(slug: string, locale: string, map: (raw: unknown) => T | null): Promise<LegalResult<T>> {
  const lang = CMS_LOCALES.has(locale) ? locale : 'es'
  const pedir = async (l: string): Promise<{ ok: true; data: T | null } | { ok: false }> => {
    try {
      const raw = await cmsFetch<unknown>(`/globals/${slug}?${new URLSearchParams({ locale: l, 'fallback-locale': 'none', depth: '0' })}`, {
        tags: [slug],
        next: { revalidate: SAFETY_REVALIDATE_SECONDS },
      })
      if (typeof raw !== 'object' || raw === null) {
        console.error(`[LEGALES] Respuesta inesperada del CMS para ${slug} (no es un objeto); se muestra el aviso de no disponible.`)
        return { ok: false }
      }
      return { ok: true, data: map(raw) }
    } catch (error) {
      console.error(`[LEGALES] No se pudo leer ${slug} del CMS (${detail(error)}); se muestra el aviso de no disponible.`)
      return { ok: false }
    }
  }

  const first = await pedir(lang)
  if (!first.ok) return { status: 'unavailable' }
  if (first.data) return { status: 'ok', data: first.data, fallback: false }
  if (lang === 'es') return { status: 'empty' }
  const es = await pedir('es')
  if (!es.ok) return { status: 'unavailable' }
  return es.data ? { status: 'ok', data: es.data, fallback: true } : { status: 'empty' }
}

export const getPoliticaPrivacidad = (locale: string): Promise<LegalResult<PoliticaPrivacidadData>> =>
  leer('politica-privacidad', locale, mapPoliticaPrivacidad)

export const getDeclaracionAccesibilidad = (locale: string): Promise<LegalResult<DeclaracionAccesibilidadData>> =>
  leer('declaracion-accesibilidad', locale, mapDeclaracionAccesibilidad)
