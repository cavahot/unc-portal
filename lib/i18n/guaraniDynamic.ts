// GLO-GN-DYN-01: diccionario dinámico aprobado para etiquetas exactas del portal.
// Qué hace: obtiene desde CMS solo glosas revisadas/oficiales y reemplaza únicamente mensajes gn que
// todavía son idénticos a su equivalente español.
// Amenaza: evita traducción automática de frases, cambios gramaticales inseguros y publicación de conflictos.
// Límite: las frases ya traducidas en messages/gn siguen siendo editoriales; el CMS actualiza etiquetas exactas.
import type { AbstractIntlMessages } from 'next-intl'
import { cmsFetch } from '@/lib/cms/client'

export type ApprovedGuaraniTerm = { terminoEs: string; terminoGn: string }

type DictionaryResponse = { terms?: ApprovedGuaraniTerm[] }

export async function getApprovedGuaraniDictionary(): Promise<ApprovedGuaraniTerm[]> {
  try {
    const result = await cmsFetch<DictionaryResponse>('/guarani-dictionary', {
      tags: ['guarani-dictionary'],
      next: { revalidate: 60 },
    })
    return (result.terms ?? []).filter((term) => term.terminoEs && term.terminoGn)
  } catch {
    // Si CMS no responde, se conserva el catálogo versionado y no se inventa una traducción.
    return []
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function overlayNode(gn: unknown, es: unknown, dictionary: Map<string, string>): unknown {
  if (typeof gn === 'string' && typeof es === 'string' && gn === es) {
    return dictionary.get(es.trim().toLocaleLowerCase('es-PY')) ?? gn
  }
  if (!isObject(gn) || !isObject(es)) return gn
  const output: Record<string, unknown> = { ...gn }
  for (const key of Object.keys(output)) {
    if (key in es) output[key] = overlayNode(output[key], es[key], dictionary)
  }
  return output
}

export function applyApprovedGuaraniDictionary(
  messagesGn: AbstractIntlMessages,
  messagesEs: AbstractIntlMessages,
  terms: ApprovedGuaraniTerm[],
): AbstractIntlMessages {
  const dictionary = new Map(
    terms.map((term) => [term.terminoEs.trim().toLocaleLowerCase('es-PY'), term.terminoGn.trim()]),
  )
  return overlayNode(messagesGn, messagesEs, dictionary) as AbstractIntlMessages
}
