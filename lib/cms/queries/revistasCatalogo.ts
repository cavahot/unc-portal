// INST-08: consulta de /revistas con estados explícitos.
// Qué hace: lee las revistas activas del CMS (por nombre) y devuelve el estado de la lectura:
//  - `ok`: hay al menos una revista válida.
//  - `empty`: el CMS respondió sin revistas (o ninguna válida).
//  - `unavailable`: el CMS no respondió o respondió algo inesperado: aviso con «Intentar de nuevo». Antes una caída se
//    mostraba como «sin revistas» (la consulta anterior devolvía una lista vacía ante cualquier error).
// Límite: nunca lanza; registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS).
import { cmsFetch } from '@/lib/cms/client'
import { CmsError } from '@/lib/cms/errors'
import { mapRevistas, type RevistaItem } from '@/lib/cms/revistasCatalogo'

export type RevistasCatalogoResult = { status: 'ok'; docs: RevistaItem[] } | { status: 'empty' } | { status: 'unavailable' }

const LIMIT = 100

function detail(error: unknown): string {
  return error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
}

export async function getRevistasCatalogo(): Promise<RevistasCatalogoResult> {
  const params = new URLSearchParams({ sort: 'nombre', limit: String(LIMIT), depth: '1' })
  params.append('where[activa][equals]', 'true')
  let res: { docs?: unknown }
  try {
    res = await cmsFetch<{ docs?: unknown }>(`/revistas?${params.toString()}`, { tags: ['revistas'] })
  } catch (error) {
    console.error(`[REVISTAS] No se pudo leer el CMS (${detail(error)}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!res || !Array.isArray(res.docs)) {
    console.error('[REVISTAS] Respuesta inesperada del CMS (sin lista de documentos); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const docs = mapRevistas(res.docs)
  return docs.length === 0 ? { status: 'empty' } : { status: 'ok', docs }
}
