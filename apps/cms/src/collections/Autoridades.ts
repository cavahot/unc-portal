import type { CollectionConfig } from 'payload'
import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateHttpsUrl } from '../utilities/validators'

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
  // AUT-01: la página /autoridades lee esta colección (única fuente). Lectura pública solo de filas activas
  // (SEC-10: evita exponer por REST/GraphQL personas retiradas); escritura solo superadmin y web-admin.
  access: {
    read: readActiveOrInstitutional,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  // AUT-01: cada cambio deja rastro de auditoría y avisa al portal (etiqueta `autoridades`) para que la página
  // se refresque sin esperar al caché. Límite: si el portal está caído la invalidación se pierde (el portal
  // aplica además una revalidación de seguridad de 1 hora).
  hooks: {
    afterChange: [
      makeAuditAfterChange('autoridades', 'Autoridad'),
      async ({ doc }) => {
        await revalidatePortalTag('autoridades', { collection: 'autoridades' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('autoridades', 'Autoridad'),
      async ({ doc }) => {
        await revalidatePortalTag('autoridades', { collection: 'autoridades' })
        return doc
      },
    ],
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
      options: [...AUTHORITY_TYPES],
    },
    {
      name: 'faculty',
      type: 'relationship',
      label: 'Facultad',
      relationTo: 'facultades',
      admin: {
        condition: (data) => data.type === 'decano',
        description: 'Facultad que dirige este/a Decano/a',
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
      // AUT-01: solo https sin credenciales; evita guardar javascript:/http: que luego se publicarían como enlace.
      validate: (value: unknown) => validateHttpsUrl(value, { required: false }),
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
