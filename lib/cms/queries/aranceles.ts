import { cmsFetch } from '../client'
import { PayloadResponse } from '../types'

export type ArancelRectorado = {
  id:       number
  concepto: string
  monto:    number
  grupo:    'multas' | 'venta' | 'educativos'
  orden:    number
  activo:   boolean
  createdAt: string
  updatedAt: string
}

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_ARANCELES: ArancelRectorado[] = [
  // Multas
  { id: 1, concepto: 'Multa por mora en matrícula — Posgrado/Maestría', monto: 10000, grupo: 'multas', orden: 1, activo: true, createdAt: '', updatedAt: '' },
  { id: 2, concepto: 'Multa por mora en pago de cuota — Posgrado/Maestría', monto: 10000, grupo: 'multas', orden: 2, activo: true, createdAt: '', updatedAt: '' },
  { id: 3, concepto: 'Penalidad por incumplimiento de contrato', monto: 60000, grupo: 'multas', orden: 3, activo: true, createdAt: '', updatedAt: '' },
  // Venta
  { id: 4, concepto: 'Constancias Varias', monto: 50000, grupo: 'venta', orden: 1, activo: true, createdAt: '', updatedAt: '' },
  { id: 5, concepto: 'Expedición de título universitario', monto: 100000, grupo: 'venta', orden: 2, activo: true, createdAt: '', updatedAt: '' },
  { id: 6, concepto: 'Registro de título universitario', monto: 200000, grupo: 'venta', orden: 3, activo: true, createdAt: '', updatedAt: '' },
  { id: 7, concepto: 'Certificado de capacitación', monto: 100000, grupo: 'venta', orden: 4, activo: true, createdAt: '', updatedAt: '' },
  { id: 8, concepto: 'Credencial de estudiante / funcionario / docente', monto: 100000, grupo: 'venta', orden: 5, activo: true, createdAt: '', updatedAt: '' },
  { id: 9, concepto: 'Certificados de estudios parcial y completo', monto: 50000, grupo: 'venta', orden: 6, activo: true, createdAt: '', updatedAt: '' },
  { id: 10, concepto: 'Certificado de trabajo', monto: 30000, grupo: 'venta', orden: 7, activo: true, createdAt: '', updatedAt: '' },
  { id: 11, concepto: 'Resumen anual de haberes', monto: 50000, grupo: 'venta', orden: 8, activo: true, createdAt: '', updatedAt: '' },
  // Educativos
  { id: 12, concepto: 'Matrícula Posgrado — Didáctica', monto: 500000, grupo: 'educativos', orden: 1, activo: true, createdAt: '', updatedAt: '' },
  { id: 13, concepto: 'Matrícula Maestría', monto: 500000, grupo: 'educativos', orden: 2, activo: true, createdAt: '', updatedAt: '' },
  { id: 14, concepto: 'Cuota Posgrado — Didáctica (módulo)', monto: 300000, grupo: 'educativos', orden: 3, activo: true, createdAt: '', updatedAt: '' },
  { id: 15, concepto: 'Cuota Maestría — Educación Superior (módulo)', monto: 400000, grupo: 'educativos', orden: 4, activo: true, createdAt: '', updatedAt: '' },
  { id: 16, concepto: 'Legalización de documentos', monto: 50000, grupo: 'educativos', orden: 5, activo: true, createdAt: '', updatedAt: '' },
  { id: 17, concepto: 'Autenticación de documentos', monto: 100000, grupo: 'educativos', orden: 6, activo: true, createdAt: '', updatedAt: '' },
  { id: 18, concepto: 'Defensa de Tesis de Maestría', monto: 1000000, grupo: 'educativos', orden: 7, activo: true, createdAt: '', updatedAt: '' },
  { id: 19, concepto: 'Matrícula Programa de Formación en Posgrado', monto: 100000, grupo: 'educativos', orden: 8, activo: true, createdAt: '', updatedAt: '' },
  { id: 20, concepto: 'Cuota mensual Programa de Formación', monto: 100000, grupo: 'educativos', orden: 9, activo: true, createdAt: '', updatedAt: '' },
  { id: 21, concepto: 'Cuota Doctorado — Educación (módulo)', monto: 750000, grupo: 'educativos', orden: 10, activo: true, createdAt: '', updatedAt: '' },
  { id: 22, concepto: 'Tutoría final Tesis Doctoral', monto: 2500000, grupo: 'educativos', orden: 11, activo: true, createdAt: '', updatedAt: '' },
  { id: 23, concepto: 'Presentación de proyecto de Tesis Doctoral', monto: 500000, grupo: 'educativos', orden: 12, activo: true, createdAt: '', updatedAt: '' },
  { id: 24, concepto: 'Examen extraordinario — Doctorado', monto: 300000, grupo: 'educativos', orden: 13, activo: true, createdAt: '', updatedAt: '' },
]

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getArancelesRectorado(): Promise<ArancelRectorado[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[activo][equals]', 'true')
    params.append('sort', 'orden')
    params.append('limit', '200')

    const res = await cmsFetch<PayloadResponse<ArancelRectorado>>(
      `/aranceles-rectorado?${params.toString()}`,
      { tags: ['aranceles-rectorado'] },
    )

    return res.docs?.length ? res.docs : FALLBACK_ARANCELES
  } catch {
    return FALLBACK_ARANCELES
  }
}

export function groupAranceles(aranceles: ArancelRectorado[]) {
  return {
    multas:     aranceles.filter((a) => a.grupo === 'multas'),
    venta:      aranceles.filter((a) => a.grupo === 'venta'),
    educativos: aranceles.filter((a) => a.grupo === 'educativos'),
  }
}

/** Format monto as Gs. 50.000 */
export function formatMonto(monto: number): string {
  return monto.toLocaleString('es-PY')
}
