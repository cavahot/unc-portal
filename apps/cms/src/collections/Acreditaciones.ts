import type { CollectionConfig } from 'payload'

import { canWriteInstitutional, readActiveOrInstitutional } from '../access/roles'
import { makeAuditAfterChange, makeAuditAfterDelete } from '../hooks/audit/auditInstitutionalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateHttpsUrl } from '../utilities/validators'

/**
 * PRA-01 (fase CMS): acreditaciones de carreras y programas de la UNC (ANEAES, ARCU-SUR u otro).
 * Una fila por carrera/programa; el historial de resoluciones y fuentes extra va en `nota`.
 * Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §3.2 y §11 | Evidencia: docs/research/evidence-register-premios.md.
 *
 * Regla rectora: nada se muestra sin fuente. `resolucion` y `vigenciaDesde/Hasta` quedan vacías mientras
 * no haya documento oficial: la ausencia de dato no se rellena. `active` y `verificado` nacen en `false`.
 * Acceso (SEC-10): el público solo lee filas `active = true`; escriben superadmin y web-admin. Sin permisos
 * nuevos. Límite: `facultad` es opcional (hay filas cuya facultad aún no está confirmada).
 */
export const Acreditaciones: CollectionConfig = {
  slug: 'acreditaciones',
  labels: {
    singular: 'Acreditación',
    plural: 'Acreditaciones',
  },
  defaultSort: 'orden',
  admin: {
    group: 'Premios y acreditaciones',
    useAsTitle: 'programa',
    defaultColumns: ['programa', 'facultad', 'organismo', 'orden', 'active', 'verificado'],
    description:
      'Carreras y programas acreditados. Cada fila lleva su fuente. Resolución y vigencia se completan solo con el documento oficial.',
  },
  access: {
    read: readActiveOrInstitutional, // SEC-10: el público solo ve lo activo
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  hooks: {
    afterChange: [
      makeAuditAfterChange('acreditaciones', 'Acreditación'),
      async ({ doc }) => {
        await revalidatePortalTag('acreditaciones', { collection: 'acreditaciones' })
        return doc
      },
    ],
    afterDelete: [
      makeAuditAfterDelete('acreditaciones', 'Acreditación'),
      async ({ doc }) => {
        await revalidatePortalTag('acreditaciones', { collection: 'acreditaciones' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'programa',
      label: 'Carrera o programa acreditado',
      type: 'text',
      required: true,
      admin: { description: 'Nombre tal como figura en la fuente. Ej.: Contaduría Pública.' },
    },
    {
      name: 'carrera',
      label: 'Carrera del portal (opcional)',
      type: 'relationship',
      relationTo: 'carreras',
      hasMany: false,
      index: true,
      admin: { description: 'Vincule la carrera si existe en el portal. Los postgrados sin carrera pueden dejarlo vacío.' },
    },
    {
      name: 'facultad',
      label: 'Facultad',
      type: 'relationship',
      relationTo: 'facultades',
      hasMany: false,
      index: true,
      admin: { description: 'Solo si la fuente nombra la facultad. Si no está confirmada, déjela vacía.' },
    },
    {
      name: 'nivel',
      label: 'Nivel',
      type: 'select',
      options: [
        { label: 'Grado', value: 'grado' },
        { label: 'Posgrado', value: 'posgrado' },
      ],
    },
    {
      name: 'sede',
      label: 'Sede o filial',
      type: 'text',
      admin: { description: 'Ej.: Concepción; Filial Horqueta.' },
    },
    {
      name: 'organismo',
      label: 'Organismo acreditador',
      type: 'select',
      required: true,
      defaultValue: 'aneaes',
      options: [
        { label: 'ANEAES', value: 'aneaes' },
        { label: 'ARCU-SUR', value: 'arcusur' },
        { label: 'Otro', value: 'otro' },
      ],
    },
    {
      name: 'modelo',
      label: 'Modelo de acreditación',
      type: 'select',
      options: [
        { label: 'Modelo Nacional', value: 'modelo-nacional' },
        { label: 'ARCU-SUR', value: 'arcusur' },
        { label: 'Otro', value: 'otro' },
      ],
      admin: { description: 'Solo si la fuente lo indica. Si no, déjelo vacío.' },
    },
    {
      name: 'ciclo',
      label: 'Ciclo o período de acreditación',
      type: 'text',
      admin: { description: 'Ej.: 2015-2019. Solo con respaldo en la fuente.' },
    },
    {
      name: 'resolucion',
      label: 'Resolución',
      type: 'text',
      admin: { description: 'Número de resolución del organismo. Vacío hasta contar con el documento oficial.' },
    },
    {
      name: 'vigenciaDesde',
      label: 'Vigencia desde',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Vacío hasta contar con el documento oficial.' },
    },
    {
      name: 'vigenciaHasta',
      label: 'Vigencia hasta',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Vacío hasta contar con el documento oficial.' },
    },
    {
      name: 'fuenteUrl',
      label: 'Fuente principal (URL oficial)',
      type: 'text',
      required: true,
      validate: (value: unknown) => validateHttpsUrl(value, { required: true }),
      admin: { description: 'Obligatoria. Documento o página oficial que respalda la acreditación (https://).' },
    },
    {
      name: 'nota',
      label: 'Nota interna',
      type: 'textarea',
      admin: { description: 'Otras fuentes, qué falta confirmar y por qué. No se muestra al público.' },
    },
    {
      name: 'orden',
      label: 'Orden de aparición',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: { description: 'Menor número = aparece primero.' },
    },
    {
      name: 'active',
      label: 'Activa (visible al público)',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Si está desmarcada, el público no puede leer esta acreditación. Actívela solo después de verificar los datos.',
      },
    },
    {
      name: 'verificado',
      label: 'Datos verificados',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Marcar solo cuando una persona comprobó contra la fuente citada el programa, la sede, el organismo y la vigencia actual. «Verificado» no publica nada por sí solo: la publicación la controla «Activa».',
      },
    },
  ],
}

export default Acreditaciones
