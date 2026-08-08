import type { CollectionConfig } from 'payload'
import { canWriteInstitutional } from '../access/roles'

const TribunalDocumentos: CollectionConfig = {
  slug: 'tribunal-documentos',
  labels: {
    singular: 'Documento del Tribunal',
    plural:   'Documentos del Tribunal',
  },
  admin: {
    group:          'Tribunal Electoral',
    useAsTitle:     'titulo',
    defaultColumns: ['titulo', 'tipo', 'orden', 'active'],
  },
  access: {
    read:   () => true,
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    afterChange: [
      async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
          const secret  = process.env.REVALIDATION_SECRET ?? ''
          await fetch(`${baseUrl}/api/revalidate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
            body:    JSON.stringify({ tag: 'tribunal-documentos' }),
          })
        } catch {
          // revalidation is best-effort
        }
      },
    ],
  },
  fields: [
    {
      name:     'titulo',
      type:     'text',
      label:    'Título del documento',
      required: true,
    },
    {
      name:     'tipo',
      type:     'select',
      label:    'Sección / Tipo',
      required: true,
      index:    true,
      options: [
        { label: 'Cronograma Electoral (descarga principal)', value: 'principal-cronograma'  },
        { label: 'Reglamento Electoral (descarga principal)', value: 'principal-reglamento'  },
        { label: 'Lista de Inscriptos',                       value: 'lista-inscriptos'       },
        { label: 'Formato de Notas',                          value: 'formato-notas'          },
        { label: 'Oficialización de Padrón Electoral',        value: 'padron-electoral'       },
        { label: 'Puesta de Manifiesto de Movimientos y Candidaturas', value: 'candidaturas' },
        { label: 'Oficialización de Candidaturas',            value: 'oficializacion'         },
        { label: 'Proclamación de Candidatos',                value: 'proclamacion'           },
      ],
    },
    {
      name:  'descripcion',
      type:  'textarea',
      label: 'Descripción (opcional)',
    },
    {
      name:  'driveUrl',
      type:  'text',
      label: 'URL del documento',
      admin: {
        description: 'URL de Google Drive, MinIO, o cualquier enlace público al documento.',
      },
    },
    {
      name:         'orden',
      type:         'number',
      label:        'Orden de aparición',
      defaultValue: 0,
    },
    {
      name:         'active',
      type:         'checkbox',
      label:        'Activo',
      defaultValue: true,
    },
  ],
}

export default TribunalDocumentos
