import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional, readFlagOrInstitutional } from '../access/roles'

/**
 * INST-05: trámites y requisitos de cada facultad (contenido de /tramites). Spec docs/specs/portal/TRAMITES.md.
 *
 * Qué es: una fila por trámite (p. ej. «Inscripción al Examen de Ingreso») con su facultad, la descripción, la lista de
 * requisitos y una nota opcional. Antes este contenido estaba escrito en `components/tramites/FacultadTabs.tsx`; ahora
 * lo edita quien tiene el rol institucional, sin desplegar.
 *
 * Acceso (amenaza que evita: publicar o ver requisitos sin revisar): un anónimo solo lee los activos; crear, editar y
 * borrar exigen `canWriteInstitutional`. Límite: no hay localización (el CMS es solo español) ni enlace por trámite
 * (ningún dato actual lo usa). Guardar o borrar revalida la etiqueta `tramites` del portal.
 */
export const Tramites: CollectionConfig = {
  slug: 'tramites',
  labels: {
    singular: 'Trámite',
    plural: 'Trámites',
  },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'facultad', 'orden', 'activa'],
    description: 'Requisitos de ingreso, matrícula y egreso que se publican en /tramites, agrupados por facultad.',
  },
  access: {
    read: readFlagOrInstitutional('activa'),
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'facultad',
      label: 'Facultad',
      type: 'relationship',
      relationTo: 'facultades',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'titulo',
      label: 'Título del trámite',
      type: 'text',
      required: true,
      maxLength: 200,
      admin: { description: 'Ej.: Inscripción al Examen de Ingreso.' },
    },
    {
      name: 'etiqueta',
      label: 'Etiqueta',
      type: 'text',
      maxLength: 40,
      admin: { description: 'Opcional. Ej.: «Art. 150°». Se muestra junto al título.' },
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      maxLength: 1000,
    },
    {
      name: 'requisitos',
      label: 'Requisitos',
      type: 'array',
      maxRows: 30,
      admin: { description: 'Un requisito por fila, en el orden en que se muestran.' },
      fields: [{ name: 'texto', label: 'Requisito', type: 'text', required: true, maxLength: 600 }],
    },
    {
      name: 'nota',
      label: 'Nota',
      type: 'textarea',
      maxLength: 600,
      admin: { description: 'Opcional. Horarios, contacto o una aclaración que aplica a todo el trámite.' },
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number',
      defaultValue: 99,
      min: 0,
      admin: { step: 1, description: 'Número menor = aparece primero dentro de su facultad.' },
    },
    {
      name: 'activa',
      label: 'Activa',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Desmarque para ocultarlo del portal sin borrarlo.' },
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('tramites')
      },
    ],
    // Borrar un trámite también debe refrescar el portal (no solo al guardar).
    afterDelete: [
      async () => {
        await revalidatePortalTag('tramites')
      },
    ],
  },
}
