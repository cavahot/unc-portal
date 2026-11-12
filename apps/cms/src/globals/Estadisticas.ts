import type { GlobalConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canUpdateGlobal } from '../access/roles'

export const Estadisticas: GlobalConfig = {
  slug: 'estadisticas',
  admin: {
    // PILARES-01: el origen de las cifras queda a la vista del editor. Los valores por defecto son los contadores de la
    // portada del sitio anterior (WordPress de unc.edu.py, modificada el 2025-11-03), verificados en su volcado del 2026-11-09.
    description:
      'Estadísticas institucionales de la Universidad Nacional de Concepción. Origen de los valores iniciales: contadores de la portada del sitio anterior unc.edu.py (actualizados por última vez el 2025-11-03). Actualícelos con el dato oficial vigente; los usan la portada y las tarjetas de los pilares.',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      name: 'totalEstudiantes',
      label: 'Total de Estudiantes',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 4985,
    },
    {
      name: 'totalDocentes',
      label: 'Total de Docentes',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 762,
    },
    {
      name: 'totalEgresados',
      label: 'Total de Egresados',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 672,
    },
    {
      name: 'totalCarrerasAcreditadas',
      label: 'Total de Carreras Acreditadas',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 10,
    },
    {
      name: 'totalFacultades',
      label: 'Total de Facultades',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 6,
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('estadisticas')
      },
    ],
  },
}
