import type { CollectionConfig } from 'payload'
import { buildLeyCollection } from './transparenciaLey'

// TRANS-01/02: Ley 5282/2014. La lógica común (accesos, enlaces, clave natural, auditoría y revalidación) vive en
// `transparenciaLey.ts`. Los ítems (categorías) ya no están aquí: son registros de `transparencia-items`.
export const Ley5282: CollectionConfig = buildLeyCollection({
  slug: 'ley5282',
  singular: 'Documento Ley 5282/2014',
  plural: 'Ley 5282/2014',
  description:
    'Documentos requeridos por el Art. 8° de la Ley 5282/2014 de Libre Acceso Ciudadano a la Información Pública y Transparencia Gubernamental. Para retirar uno, desmarque «Publicado».',
  itemHelp: 'Ítem exigido por el Art. 8° de la Ley 5282/2014 (los ítems se administran en «Ítems de transparencia»)',
})
