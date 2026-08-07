import type { CollectionConfig } from 'payload'

const CATEGORIES = [
  { label: 'Su estructura orgánica',                                                                                             value: 'item-1' },
  { label: 'Facultades, deberes, funciones y/o atribuciones de sus órganos y dependencias',                                     value: 'item-2' },
  { label: 'Marco normativo que rija su funcionamiento',                                                                         value: 'item-3' },
  { label: 'Descripción general de cómo funciona y proceso de toma de decisiones',                                               value: 'item-4' },
  { label: 'Listado actualizado de personas que cumplan función pública o sean funcionarios públicos',                           value: 'item-5' },
  { label: 'Descripción de la política institucional y de los planes de acción',                                                 value: 'item-6' },
  { label: 'Descripción de los programas institucionales en ejecución',                                                          value: 'item-7' },
  { label: 'Informes de auditoría',                                                                                              value: 'item-8' },
  { label: 'Informes de viajes oficiales dentro del territorio o al extranjero',                                                 value: 'item-9' },
  { label: 'Convenios y contratos celebrados',                                                                                   value: 'item-10' },
  { label: 'Cartas oficiales',                                                                                                   value: 'item-11' },
  { label: 'Informes finales de consultorías',                                                                                   value: 'item-12' },
  { label: 'Cuadros de resultados',                                                                                              value: 'item-13' },
  { label: 'Lista de poderes vigentes otorgados a abogados',                                                                     value: 'item-14' },
  { label: 'Sistema de mantenimiento, clasificación e índice de documentos existentes',                                          value: 'item-15' },
  { label: 'Procedimientos para que personas interesadas puedan acceder a documentos',                                           value: 'item-16' },
  { label: 'Mecanismos de participación ciudadana',                                                                              value: 'item-17' },
]

export const Ley5282: CollectionConfig = {
  slug: 'ley5282',
  labels: {
    singular: 'Documento Ley 5282/2014',
    plural: 'Ley 5282/2014',
  },
  admin: {
    useAsTitle: 'period',
    defaultColumns: ['category', 'period', 'order', 'active'],
    group: 'Transparencia',
    description: 'Documentos requeridos por el Art. 8° de la Ley 5282/2014 de Libre Acceso Ciudadano a la Información Pública y Transparencia Gubernamental.',
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
        description: 'Ítem exigido por el Art. 8° de la Ley 5282/2014',
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
