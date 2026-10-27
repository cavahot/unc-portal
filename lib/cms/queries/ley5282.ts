import { getLeyDocuments } from './transparenciaLeyes'
import type { LeyResult } from '../transparenciaLeyes'

// TRANS-01: documentos de la Ley 5282/2014 (17 ítems del Art. 8°) desde la colección PROPIA `ley5282`. Etiqueta de
// caché `ley5282`. Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md.
export function getLey5282Page(): Promise<LeyResult> {
  return getLeyDocuments('ley5282')
}
