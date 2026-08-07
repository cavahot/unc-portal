import type { CollectionConfig } from 'payload'

const CATEGORIES = [
  { label: 'Organigrama',                                                         value: 'organigrama' },
  { label: 'Dirección y Teléfono de la Entidad y Dependencias',                  value: 'direccion-telefono' },
  { label: 'Nómina del Personal',                                                 value: 'nomina-personal' },
  { label: 'Presupuesto de Ingresos – Gastos',                                    value: 'presupuesto-ingresos-gastos' },
  { label: 'Anexo del Personal',                                                  value: 'anexo-personal' },
  { label: 'Ejecución Presupuestaria',                                             value: 'ejecucion-presupuestaria' },
  { label: 'Registro Mensual de Viáticos e Informe de Actividades',               value: 'registro-viaticos' },
  { label: 'Listado de Bienes Patrimoniales',                                      value: 'bienes-patrimoniales' },
  { label: 'Listado de Funcionarios Comisionados de Otras Instituciones',          value: 'funcionarios-comisionados' },
  { label: 'Otras Informaciones',                                                  value: 'otras-informaciones' },
  { label: 'Cumplimiento Art. 7°',                                                 value: 'cumplimiento-art7' },
]

export const Ley5189: CollectionConfig = {
  slug: 'ley5189',
  labels: {
    singular: 'Documento Ley 5189/2014',
    plural: 'Ley 5189/2014',
  },
  admin: {
    useAsTitle: 'period',
    defaultColumns: ['category', 'period', 'order', 'active'],
    group: 'Transparencia',
    description: 'Documentos requeridos por la Ley 5189/2014 sobre provisión de información en el uso de recursos públicos.',
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      required: true,
      options: CATEGORIES,
      admin: {
        description: 'Categoría exigida por la Ley 5189/2014',
      },
    },
    {
      name: 'period',
      type: 'text',
      label: 'Período',
      required: true,
      admin: {
        description: 'Ej: "Enero 2024", "2024", "I Trimestre 2024"',
      },
    },
    {
      name: 'description',
      type: 'text',
      label: 'Descripción (opcional)',
      admin: {
        description: 'Nota breve sobre este documento específico',
      },
    },
    {
      name: 'driveUrl',
      type: 'text',
      label: 'Enlace Google Drive',
      required: true,
      admin: {
        description: 'URL de Google Drive para descarga del documento',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden de visualización',
      defaultValue: 0,
      admin: {
        description: 'Menor número = aparece primero dentro de su categoría',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: true,
      admin: {
        description: 'Solo los documentos publicados se muestran en el portal',
      },
    },
  ],
}
