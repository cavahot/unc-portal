import type { GlobalConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'

export const Estadisticas: GlobalConfig = {
  slug: 'estadisticas',
  admin: {
    description: 'Estadísticas institucionales de la Universidad Nacional de Concepción',
  },
  access: {
    read: async () => true,
    update: async ({ req }) => !!req.user,
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
