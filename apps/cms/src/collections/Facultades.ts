import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional, readFlagOrInstitutional } from '../access/roles'
import { slugify } from '../utilities/slugify'
import { validateFacultadLogoPath, validateHttpsUrl, validateRedUrl } from '../utilities/validators'

export const Facultades: CollectionConfig = {
  slug: 'facultades',
  labels: {
    singular: 'Facultad',
    plural: 'Facultades',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'decano', 'email', 'activa'],
  },
  access: {
    // FAC-01 (SEC-10): un anónimo solo lee facultades activas (antes `() => true`). Spec FACULTADES.md §3.1.
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
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: false,
    },
    {
      name: 'decano',
      label: 'Decano/a (obsoleto)',
      type: 'text',
      required: false,
      admin: {
        // FAC-01: duplicado de la colección Autoridades; la página de facultad nueva ya no lo lee.
        description: 'Obsoleto: el decano se carga en Autoridades (tipo «Decano», facultad). Solo lo usan /facultades y la ruta dinámica.',
      },
    },
    {
      name: 'email',
      label: 'Correo electrónico',
      type: 'email',
      required: false,
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      type: 'text',
      required: false,
    },
    {
      name: 'imagen',
      label: 'Imagen',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'siglas',
      label: 'Siglas',
      type: 'text',
      maxLength: 12,
      admin: {
        description: 'PRA-01: siglas oficiales (máx. 12 caracteres). Déjelas vacías si no están confirmadas.',
      },
    },
    {
      name: 'logoPath',
      label: 'Ruta del logo (archivo del proyecto)',
      type: 'text',
      // PRA-01: ruta estática validada; evita path traversal y enlaces externos (ver utilities/validators.ts).
      validate: validateFacultadLogoPath,
      admin: {
        description:
          'Archivo versionado en el proyecto: /images/facultades/<archivo>.png|jpg|webp. Sin subcarpetas ni enlaces externos.',
      },
    },
    // FAC-01: datos de la página de facultad (spec docs/specs/portal/FACULTADES.md §3.1). Todos opcionales: lo que
    // no tiene fuente queda vacío y la página oculta la sección.
    {
      name: 'historia',
      label: 'Historia (reseña breve)',
      type: 'textarea',
      maxLength: 2000,
      admin: { description: 'Texto plano, 2-4 párrafos separados por una línea en blanco. Solo hechos con fuente.' },
    },
    {
      name: 'direccion',
      label: 'Dirección',
      type: 'text',
      maxLength: 200,
      admin: { description: 'Ej.: Campus Universitario: Ruta Py05, Km 210.' },
    },
    {
      name: 'correosAdicionales',
      label: 'Correos adicionales',
      type: 'array',
      maxRows: 4,
      admin: { description: 'Además del correo principal. La etiqueta es opcional (p. ej. «Secretaría General»).' },
      fields: [
        { name: 'etiqueta', label: 'Etiqueta', type: 'text', maxLength: 60 },
        { name: 'email', label: 'Correo', type: 'email', required: true },
      ],
    },
    {
      name: 'sitioWeb',
      label: 'Sitio web de la facultad',
      type: 'text',
      // FAC-01: solo https bien formado (evita javascript:, http y credenciales en el enlace público).
      validate: (value: unknown) => validateHttpsUrl(value),
      admin: { description: 'Dirección completa con https://, p. ej. https://www.founc.edu.py/' },
    },
    {
      name: 'redes',
      label: 'Redes sociales',
      type: 'array',
      maxRows: 6,
      fields: [
        {
          name: 'red',
          label: 'Red',
          type: 'select',
          required: true,
          options: [
            { label: 'Facebook', value: 'facebook' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'X (Twitter)', value: 'x' },
            { label: 'YouTube', value: 'youtube' },
          ],
        },
        {
          name: 'url',
          label: 'Enlace',
          type: 'text',
          required: true,
          // FAC-01: el host debe corresponder a la red elegida (evita enlaces engañosos con la marca UNC).
          validate: (value: unknown, options: unknown) => validateRedUrl(value, options as { siblingData?: { red?: unknown } }),
        },
      ],
    },
    {
      name: 'activa',
      label: 'Activa',
      type: 'checkbox',
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
        await revalidatePortalTag('facultades')
      },
    ],
    // PRA-01: borrar una facultad también debe refrescar el portal (antes solo se revalidaba al guardar).
    afterDelete: [
      async () => {
        await revalidatePortalTag('facultades')
      },
    ],
  },
}

export default Facultades
