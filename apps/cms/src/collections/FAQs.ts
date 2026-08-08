import type { CollectionConfig } from 'payload'

export const FAQs: CollectionConfig = {
  slug: 'faqs',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', 'order', 'active'],
    description: 'Preguntas frecuentes que aparecen en la página /preguntas-frecuentes del portal.',
    group: 'Contenido',
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'question',
      label: 'Pregunta',
      type: 'text',
      required: true,
      minLength: 10,
      maxLength: 300,
    },
    {
      name: 'answer',
      label: 'Respuesta',
      type: 'richText',
      required: true,
      admin: {
        description: 'Podés incluir negritas, listas, links y más.',
      },
    },
    {
      name: 'category',
      label: 'Categoría',
      type: 'select',
      required: true,
      options: [
        { label: '⏰ Horarios y Atención', value: 'horarios' },
        { label: '🎓 Admisión e Inscripción', value: 'admision' },
        { label: '📋 Trámites', value: 'tramites' },
        { label: '🏛️ Servicios', value: 'servicios' },
        { label: '📊 Transparencia', value: 'transparencia' },
        { label: '💼 Recursos Humanos', value: 'rrhh' },
        { label: '📜 Títulos y Certificados', value: 'titulos' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'order',
      label: 'Orden',
      type: 'number',
      defaultValue: 99,
      admin: {
        description: 'Número menor = aparece primero dentro de la categoría.',
        position: 'sidebar',
      },
    },
    {
      name: 'active',
      label: '¿Visible en el portal?',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      label: 'Etiquetas de búsqueda',
      type: 'array',
      fields: [
        {
          name: 'tag',
          label: 'Etiqueta',
          type: 'text',
          required: true,
        },
      ],
      maxRows: 10,
      admin: {
        description: 'Palabras clave para mejorar la búsqueda interna.',
      },
    },
  ],
  timestamps: true,
}
