import { cmsFetch } from '../client'

export interface TribunalMiembroItem {
  id:     number
  nombre: string
  cargo:  string
  foto?:  {
    url:          string
    alt?:         string
    width?:       number
    height?:      number
    blurDataURL?: string
  }
  orden: number
}

export type TribunalDocumentoTipo =
  | 'principal-cronograma'
  | 'principal-reglamento'
  | 'lista-inscriptos'
  | 'formato-notas'
  | 'padron-electoral'
  | 'candidaturas'
  | 'oficializacion'
  | 'proclamacion'

export interface TribunalDocumentoItem {
  id:           number
  titulo:       string
  tipo:         TribunalDocumentoTipo
  descripcion?: string
  driveUrl?:    string
  orden:        number
}

export const ACCORDION_TIPOS: TribunalDocumentoTipo[] = [
  'lista-inscriptos',
  'formato-notas',
  'padron-electoral',
  'candidaturas',
  'oficializacion',
  'proclamacion',
]

export const DEMO_MIEMBROS: TribunalMiembroItem[] = [
  { id: 1, nombre: 'Abg. Nadia Carolina Argüello Aguilar', cargo: 'Presidente',      orden: 1 },
  { id: 2, nombre: 'Abg. Felix Ramón Lezcano Antúnez',     cargo: 'Vicepresidente',  orden: 2 },
  { id: 3, nombre: 'Mg. Jorge Raúl Marín Cuevas',          cargo: 'Miembro Titular', orden: 3 },
  { id: 4, nombre: 'Mg. Leticia María López Paez',          cargo: 'Secretaria',      orden: 4 },
  { id: 5, nombre: 'Mg. Oscar David Franco Díaz',           cargo: 'Ujier',           orden: 5 },
]

export const DEMO_DOCUMENTOS: TribunalDocumentoItem[] = [
  { id: 1, titulo: 'Cronograma Electoral 2026',                              tipo: 'principal-cronograma', driveUrl: '',  orden: 1 },
  { id: 2, titulo: 'Reglamento Electoral',                                   tipo: 'principal-reglamento', driveUrl: '',  orden: 2 },
  { id: 3, titulo: 'Lista de Inscriptos',                                    tipo: 'lista-inscriptos',                    orden: 3 },
  { id: 4, titulo: 'Formato de Notas',                                       tipo: 'formato-notas',                       orden: 4 },
  { id: 5, titulo: 'Oficialización de Padrón Electoral',                     tipo: 'padron-electoral',                    orden: 5 },
  { id: 6, titulo: 'Puesta de Manifiesto de Movimientos y Candidaturas',     tipo: 'candidaturas',                        orden: 6 },
  { id: 7, titulo: 'Oficialización de Candidaturas',                         tipo: 'oficializacion',                      orden: 7 },
  { id: 8, titulo: 'Proclamación de Candidatos',                             tipo: 'proclamacion',                        orden: 8 },
]

export async function getTribunalMiembros(): Promise<TribunalMiembroItem[]> {
  try {
    const data = await cmsFetch<{ docs: TribunalMiembroItem[] }>(
      '/tribunal-miembros?where[active][equals]=true&sort=orden&limit=20&depth=1',
      { tags: ['tribunal-miembros'] },
    )
    // Fall back to demo when collection is empty (CMS not seeded yet)
    return data.docs.length > 0 ? data.docs : DEMO_MIEMBROS
  } catch {
    return DEMO_MIEMBROS
  }
}

export async function getTribunalDocumentos(): Promise<TribunalDocumentoItem[]> {
  try {
    const data = await cmsFetch<{ docs: TribunalDocumentoItem[] }>(
      '/tribunal-documentos?where[active][equals]=true&sort=orden&limit=50',
      { tags: ['tribunal-documentos'] },
    )
    // Fall back to demo when collection is empty (CMS not seeded yet)
    return data.docs.length > 0 ? data.docs : DEMO_DOCUMENTOS
  } catch {
    return DEMO_DOCUMENTOS
  }
}
