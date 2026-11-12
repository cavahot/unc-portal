// GLO-GN-DYN-01: exposición pública mínima del diccionario aprobado para el portal.
// Qué hace: devuelve solo términos activos, oficiales, revisados y con confianza A/B.
// Amenaza: evita publicar notas internas, conflictos, fuentes no oficiales o glosas sin revisión humana.
// Límite: no traduce frases completas; el portal solo aplica coincidencias exactas de etiquetas.
import type { Endpoint } from 'payload'

export const guaraniDictionaryEndpoint: Endpoint = {
  path: '/guarani-dictionary',
  method: 'get',
  handler: async (req) => {
    const result = await req.payload.find({
      collection: 'glosario-guarani',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      where: {
        and: [
          { activo: { equals: true } },
          { oficial: { equals: true } },
          { revisado: { equals: true } },
          { estadoRevision: { equals: 'aprobado' } },
          { confianza: { in: ['A', 'B'] } },
        ],
      },
    })

    const terms = result.docs
      .map((row) => ({
        terminoEs: typeof row.terminoEs === 'string' ? row.terminoEs.trim() : '',
        terminoGn: typeof row.terminoGn === 'string' ? row.terminoGn.trim() : '',
      }))
      .filter((row) => row.terminoEs && row.terminoGn)

    return Response.json(
      { version: new Date().toISOString().slice(0, 10), terms },
      {
        headers: {
          // El caché corto permite actualizar el vocabulario sin congelar la traducción del portal.
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    )
  },
}
