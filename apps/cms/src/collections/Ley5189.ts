import type { CollectionConfig } from 'payload'
import { buildLeyCollection } from './transparenciaLey'

// TRANS-01/02: Ley 5189/2014. La lógica común (accesos, enlaces, clave natural, auditoría y revalidación) vive en
// `transparenciaLey.ts`. Los ítems (categorías) ya no están aquí: son registros de `transparencia-items`.
export const Ley5189: CollectionConfig = buildLeyCollection({
  slug: 'ley5189',
  singular: 'Documento Ley 5189/2014',
  plural: 'Ley 5189/2014',
  description:
    'Documentos requeridos por la Ley 5189/2014 sobre provisión de información en el uso de recursos públicos. Para retirar uno, desmarque «Publicado».',
  itemHelp: 'Categoría exigida por la Ley 5189/2014 (los ítems se administran en «Ítems de transparencia»)',
})
