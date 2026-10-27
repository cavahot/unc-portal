import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional, readFlagOrInstitutional } from '../access/roles'
import { validateResolucionEnlace, validateResolucionNumero } from '../utilities/validators'
import { slugify } from '../utilities/slugify'

export const Carreras: CollectionConfig = {
  slug: 'carreras',
  labels: {
    singular: 'Carrera',
    plural: 'Carreras',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'facultad', 'duracion', 'modalidad', 'activa'],
  },
  access: {
    // FAC-01 (SEC-10): un anónimo solo lee carreras activas (antes `() => true`). Spec FACULTADES.md §3.2.
    read: readFlagOrInstitutional('activa'),
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug (URL)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Generado automáticamente desde el nombre.',
      },
    },
    {
      name: 'facultad',
      label: 'Facultad',
      type: 'relationship',
      relationTo: 'facultades',
      required: true,
      hasMany: false,
    },
    {
      name: 'duracion',
      label: 'Duración (años)',
      type: 'number',
      // FAC-01: opcional; antes obligatorio, lo que forzaba a inventar un dato que la fuente no publica.
      min: 1,
      max: 12,
      admin: { step: 0.5, description: 'Déjelo vacío si no está confirmado por la Secretaría Académica.' },
    },
    {
      name: 'titulo',
      label: 'Título otorgado',
      type: 'text',
      // FAC-01: opcional por la misma razón que la duración.
      maxLength: 200,
      admin: { description: 'Déjelo vacío si no está confirmado.' },
    },
    {
      name: 'modalidad',
      label: 'Modalidad',
      type: 'select',
      options: [
        { label: 'Presencial', value: 'Presencial' },
        { label: 'Semipresencial', value: 'Semipresencial' },
        { label: 'Virtual', value: 'Virtual' },
      ],
      // FAC-01: sin valor por defecto; antes cada carrera nueva quedaba «Presencial» aunque nadie lo hubiera confirmado.
      required: false,
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: false,
    },
    {
      name: 'resolucion',
      label: 'Resolución (obsoleto)',
      type: 'text',
      required: false,
      admin: {
        // FAC-01: la etiqueta anterior («de acreditación») era incorrecta: es la resolución CONES de habilitación.
        description: 'Obsoleto: use «Resoluciones CONES». Solo lo leen las páginas de facultad aún no convertidas.',
      },
    },
    {
      name: 'resoluciones',
      label: 'Resoluciones CONES',
      type: 'array',
      maxRows: 6,
      admin: { description: 'Resoluciones del CONES que habilitan la carrera (no son acreditaciones ANEAES).' },
      fields: [
        { name: 'numero', label: 'Número', type: 'text', required: true, validate: validateResolucionNumero, admin: { description: 'Ej.: 165/15' } },
        {
          name: 'enlace',
          label: 'Enlace al documento',
          type: 'text',
          validate: validateResolucionEnlace,
          admin: { description: 'Opcional. Solo Google Drive o sitios de la UNC / FOUNC, con https://' },
        },
        { name: 'detalle', label: 'Detalle', type: 'text', maxLength: 80, admin: { description: 'Opcional. Ej.: Actualización' } },
      ],
    },
    {
      name: 'perfil',
      label: 'Perfil del egresado',
      type: 'textarea',
      maxLength: 2000,
      admin: { description: 'Opcional. Solo texto oficial de la facultad.' },
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number',
      defaultValue: 99,
      min: 0,
      admin: { step: 1, description: 'Número menor = aparece primero dentro de su tipo.' },
    },
    {
      name:         'tipo',
      label:        'Tipo',
      type:         'select',
      index:        true,
      defaultValue: 'grado',
      options: [
        { label: 'Pregrado / Grado', value: 'grado'    },
        { label: 'Posgrado',         value: 'posgrado' },
      ],
    },
    {
      name:  'sede',
      label: 'Sede o Filial',
      type:  'text',
      admin: { description: 'Ej: Central/Concepción' },
    },
    {
      name:         'activa',
      label:        'Activa',
      type:         'checkbox',
      defaultValue: true,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.nombre) {
          data.slug = slugify(data.nombre)
        }
        return data
      },
    ],
    afterChange: [
      async () => {
        await revalidatePortalTag('carreras')
      },
    ],
    // FAC-01: borrar una carrera también debe refrescar el portal (antes solo se revalidaba al guardar).
    afterDelete: [
      async () => {
        await revalidatePortalTag('carreras')
      },
    ],
  },
}

export default Carreras
