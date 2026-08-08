import type { CollectionConfig } from 'payload'
import { canWriteInstitutional } from '../access/roles'

const AUTHORITY_TYPES = [
  { label: 'Rector/a', value: 'rector' },
  { label: 'Vicerrector/a', value: 'vicerrector' },
  { label: 'Decano/a', value: 'decano' },
  { label: 'Secretario/a General', value: 'secretario' },
  { label: 'Director/a', value: 'director' },
] as const

export const Autoridades: CollectionConfig = {
  slug: 'autoridades',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'type', 'order', 'active'],
    group: 'Institucional',
    description: 'Autoridades y funcionarios de la institución con fotografías y currículum.',
  },
  access: {
    read: () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nombre completo',
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      label: 'Cargo',
      required: true,
      admin: { description: 'Ej: Rector, Decana de la Facultad de Humanidades' },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Tipo de autoridad',
      required: true,
      options: AUTHORITY_TYPES,
    },
    {
      name: 'faculty',
      type: 'text',
      label: 'Facultad',
      admin: {
        condition: (data) => data.type === 'decano',
        description: 'Nombre de la facultad que dirige',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      label: 'Fotografía',
      relationTo: 'media',
    },
    {
      name: 'cvFile',
      type: 'upload',
      label: 'Currículum Vitae (archivo)',
      relationTo: 'media',
      admin: {
        description: 'Suba el CV en formato PDF o Word (.doc, .docx)',
      },
    },
    {
      name: 'cvUrl',
      type: 'text',
      label: 'Currículum Vitae (URL externa)',
      admin: {
        description: 'Enlace externo al CV si no se sube un archivo',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Biografía corta',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Correo institucional',
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden',
      defaultValue: 99,
      index: true,
      admin: { description: 'Número menor = aparece primero' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Activo',
      defaultValue: true,
      index: true,
    },
  ],
}
