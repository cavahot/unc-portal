import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional, readFlagOrInstitutional } from '../access/roles'
import {
  validateDependenciaCorreo,
  validateDependenciaLogo,
  validateDependenciaSlug,
  validateDependenciaWeb,
} from '../utilities/validators'

/**
 * INST-12: directorio de contactos por dependencia (contenido de /contacto/dependencias). Spec docs/specs/portal/DEPENDENCIAS.md.
 *
 * Qué es: una fila por dependencia (Rectorado, cada facultad) con una o más sedes y, por sede, dirección, teléfonos, correos y
 * sitio web. Antes estaba escrito en el código de la página; ahora lo edita quien tiene el rol institucional, sin desplegar.
 *
 * Acceso (amenaza que evita: publicar un dato de contacto sin revisar): un anónimo solo lee las activas; crear, editar y borrar
 * exigen `canWriteInstitutional`. Los validadores impiden un logo fuera de /images/, un correo mal formado y una web que no sea
 * http(s). Límite: no hay localización (el CMS es solo español); los datos de contacto no se traducen.
 */
export const DependenciasContacto: CollectionConfig = {
  slug: 'dependencias-contacto',
  labels: {
    singular: 'Dependencia (contactos)',
    plural: 'Contactos por dependencia',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'slug', 'orden', 'activa'],
    description: 'Directorio que se publica en /contacto/dependencias: Rectorado y facultades, con sus sedes, teléfonos, correos y sitios web.',
  },
  access: {
    read: readFlagOrInstitutional('activa'),
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    { name: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 120, admin: { description: 'Ej.: Facultad de Medicina.' } },
    {
      name: 'slug',
      label: 'Identificador',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 60,
      validate: validateDependenciaSlug,
      admin: { description: 'Minúsculas y guiones. Es el ancla de la página (#dept-medicina). No lo cambie si ya hay enlaces a esa dependencia.' },
    },
    {
      name: 'logo',
      label: 'Logo (ruta pública)',
      type: 'text',
      maxLength: 160,
      validate: validateDependenciaLogo,
      admin: { description: 'Ruta bajo /images/. Ej.: /images/facultades/medicina.png.' },
    },
    {
      name: 'destacada',
      label: 'Cabecera destacada (verde)',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Se usa para el Rectorado. Las demás dependencias llevan cabecera clara.' },
    },
    { name: 'orden', label: 'Orden', type: 'number', defaultValue: 99, min: 0, admin: { step: 1, description: 'Número menor = aparece primero.' } },
    { name: 'activa', label: 'Activa', type: 'checkbox', defaultValue: true, admin: { description: 'Desmarque para ocultarla del portal sin borrarla.' } },
    {
      name: 'sedes',
      label: 'Sedes',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 10,
      admin: { description: 'Una fila por sede o filial, en el orden en que se muestran.' },
      fields: [
        { name: 'nombre', label: 'Nombre de la sede', type: 'text', maxLength: 120, admin: { description: 'Opcional. Ej.: Filial Horqueta.' } },
        { name: 'direccion', label: 'Dirección', type: 'text', required: true, maxLength: 200 },
        {
          name: 'telefonos',
          label: 'Teléfonos',
          type: 'array',
          maxRows: 10,
          fields: [{ name: 'texto', label: 'Teléfono', type: 'text', required: true, maxLength: 40, admin: { description: 'Como se muestra. Ej.: (595 331) 241069.' } }],
        },
        {
          name: 'correos',
          label: 'Correos',
          type: 'array',
          maxRows: 10,
          fields: [{ name: 'texto', label: 'Correo', type: 'text', required: true, maxLength: 120, validate: validateDependenciaCorreo }],
        },
        { name: 'web', label: 'Sitio web', type: 'text', maxLength: 200, validate: validateDependenciaWeb, admin: { description: 'Opcional. Debe empezar con http:// o https://.' } },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('dependencias-contacto')
      },
    ],
    // Borrar una dependencia también debe refrescar el portal (no solo al guardar).
    afterDelete: [
      async () => {
        await revalidatePortalTag('dependencias-contacto')
      },
    ],
  },
}
