/**
 * CNV-01: regla de clasificación de convenios nacionales en `institucional` o `beneficios`.
 * Spec: docs/specs/portal/CONVENIOS.md §3.3 | Evidencia: RDD-CNV-04.
 *
 * Qué hace: decide la categoría INICIAL con la que el seed carga cada fila del sitio publicado. Después la
 * categoría la decide el Product Owner en el panel; esta función no se usa en el portal ni en el CMS.
 * Por qué existe: la tabla publicada mezcla acuerdos académicos/institucionales con ~30 acuerdos comerciales
 * de descuentos para estudiantes (2022–2024). Sin separarlos, un visitante que busca convenios académicos
 * tiene que leer decenas de filas de comercios locales.
 * Regla (pura, determinista, sin red):
 *   1. «descuento» o «beneficios monetarios» en la denominación o la finalidad -> `beneficios`.
 *   2. La contraparte es una «empresa» y la finalidad cita los Objetivos de Desarrollo Sostenible (patrón de
 *      los acuerdos comerciales de 2024 cuya finalidad no nombra el descuento) -> `beneficios`.
 *   3. Todo lo demás -> `institucional`.
 * Límite: es una heurística sobre texto libre; una fila mal clasificada se corrige en el panel y el seed
 * nunca la vuelve a tocar (no pisa filas existentes).
 */

/** Minúsculas y sin tildes, para que «Descuentos» y «descuentos» cuenten igual. */
function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** @param {{ title: string, parties: string, objective: string }} row */
export function classifyConvenio(row) {
  const title = fold(row.title)
  const parties = fold(row.parties)
  const objective = fold(row.objective)
  if (/descuento/.test(title) || /descuento|beneficios monetarios/.test(objective)) return 'beneficios'
  if (/\bempresa\b/.test(parties) && /objetivos de desarrollo sostenible/.test(objective)) return 'beneficios'
  return 'institucional'
}
