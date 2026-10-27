import { getLeyDocuments } from './transparenciaLeyes'
import type { LeyResult } from '../transparenciaLeyes'

// TRANS-01: documentos de la Ley 5189/2014 (11 categorías) desde la colección `ley5189`. Etiqueta de caché propia
// `ley5189`, que el CMS revalida al guardar o retirar un documento. Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md.
export function getLey5189Page(): Promise<LeyResult> {
  return getLeyDocuments('ley5189')
}
