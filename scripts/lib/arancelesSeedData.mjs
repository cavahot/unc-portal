/**
 * arancelesSeedData.mjs — ARR-01
 *
 * Los 24 aranceles que publica https://www.unc.edu.py/aranceles-rectorado/ (consultada el 25-10-26), con la
 * redacción oficial y el número de fila del sitio como `orden`. Spec: docs/specs/portal/ARANCELES-RECTORADO.md §5.
 * Montos en guaraníes enteros: el sitio escribe «10.000» sin símbolo; el «.» es separador de miles.
 * Única corrección sobre el original: «Didactica» -> «Didáctica» (errata ortográfica inequívoca, regla del PO).
 * Después de sembrar, el CMS es la única fuente: los cambios se hacen en el panel, no aquí.
 */

/** @typedef {{ grupo: 'multas' | 'venta' | 'educativos', orden: number, concepto: string, monto: number }} ArancelSeed */

/** @type {ArancelSeed[]} */
export const ARANCELES_OFICIALES = [
  // MULTAS
  { grupo: 'multas', orden: 1, concepto: 'Multas por retraso de Matrícula Post Grado y Maestría', monto: 10000 },
  { grupo: 'multas', orden: 2, concepto: 'Multas por retraso de Cuotas Post Grado y Maestría', monto: 10000 },
  { grupo: 'multas', orden: 3, concepto: 'Multas por Incumplimiento de Contrato', monto: 60000 },

  // VENTA DE BIENES Y SERVICIOS DE LA ADMINISTRACIÓN PÚBLICA
  { grupo: 'venta', orden: 1, concepto: 'Constancias Varias', monto: 50000 },
  { grupo: 'venta', orden: 2, concepto: 'Expedición de títulos', monto: 100000 },
  { grupo: 'venta', orden: 3, concepto: 'Inscripción de Títulos Universitarios', monto: 200000 },
  { grupo: 'venta', orden: 4, concepto: 'Certificación de Capacitación', monto: 100000 },
  { grupo: 'venta', orden: 5, concepto: 'Credencial de estudiante-funcionario-docente', monto: 100000 },
  { grupo: 'venta', orden: 6, concepto: 'Certificados de Estudios Parcial y Completo', monto: 50000 },
  { grupo: 'venta', orden: 7, concepto: 'Certificado de trabajo laboral', monto: 30000 },
  { grupo: 'venta', orden: 8, concepto: 'Extracto consolidado de liquidación salarial anual', monto: 50000 },

  // ARANCELES EDUCATIVOS
  { grupo: 'educativos', orden: 1, concepto: 'Matrícula Post Grado en Didáctica p/ Educación Superior', monto: 500000 },
  { grupo: 'educativos', orden: 2, concepto: 'Matrícula de Maestría', monto: 500000 },
  { grupo: 'educativos', orden: 3, concepto: 'Cuota Post Grado en Didáctica p/ Educación Superior', monto: 300000 },
  { grupo: 'educativos', orden: 4, concepto: 'Cuota Maestría en Educación Superior', monto: 400000 },
  { grupo: 'educativos', orden: 5, concepto: 'Legalizaciones', monto: 50000 },
  { grupo: 'educativos', orden: 6, concepto: 'Autenticación de Documentos', monto: 100000 },
  { grupo: 'educativos', orden: 7, concepto: 'Derecho de Defensa de Tesis Maestría', monto: 1000000 },
  { grupo: 'educativos', orden: 8, concepto: 'Matrícula Post Grado Programa Capacitación', monto: 100000 },
  { grupo: 'educativos', orden: 9, concepto: 'Cuota Post Grado Programa Capacitación', monto: 100000 },
  { grupo: 'educativos', orden: 10, concepto: 'Cuota Doctorado en Educación', monto: 750000 },
  { grupo: 'educativos', orden: 11, concepto: 'Tutoría de Trabajo Final de Doctorado en Educación', monto: 2500000 },
  { grupo: 'educativos', orden: 12, concepto: 'Derecho de Presentación de Proyecto de Tesis Doctorado en Educación', monto: 500000 },
  { grupo: 'educativos', orden: 13, concepto: 'Derecho de Examen Extraordinario – Doctorado en Educación', monto: 300000 },
]

/** Campos que la siembra compara con una fila existente (solo para informar diferencias; nunca los pisa). */
export const SEED_COMPARED_FIELDS = ['monto', 'orden']

/** Cuerpo del POST: la fila oficial publicada. */
export function toCmsPayloadArancel(item) {
  return { grupo: item.grupo, orden: item.orden, concepto: item.concepto, monto: item.monto, active: true }
}
