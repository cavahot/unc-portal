import type { CollectionConfig } from 'payload'
import { revalidatePortalTag } from '../utilities/revalidation'
import { canWriteInstitutional, readFlagOrInstitutional } from '../access/roles'
import {
  validateCalendarioDescripcion,
  validateCalendarioEvento,
  validateCalendarioFin,
} from '../utilities/validators'

/**
 * INST-07: bloques del calendario académico (contenido de /calendario-academico). Spec docs/specs/portal/CALENDARIO.md.
 *
 * Qué es: un bloque por semestre («1er Semestre 2026») o por conjunto de mesas de exámenes finales, con una lista de
 * fechas. Antes las fechas estaban escritas en los archivos de mensajes; ahora las edita quien tiene el rol institucional,
 * sin desplegar. Las fechas son reales (inicio y fin opcional), no texto: así el portal las muestra en el idioma de la
 * persona y el CMS rechaza un período invertido.
 *
 * Acceso (amenaza que evita: publicar una fecha sin revisar): un anónimo solo lee los activos; crear, editar y borrar
 * exigen `canWriteInstitutional`. Límite: no hay localización (el CMS es solo español), así que la descripción libre de
 * un evento «otro» no se traduce; los cinco eventos estándar sí (sus etiquetas viven en los mensajes del portal).
 */
export const CalendarioAcademico: CollectionConfig = {
  slug: 'calendario-academico',
  labels: {
    singular: 'Bloque del calendario académico',
    plural: 'Calendario académico',
  },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'tipo', 'anio', 'orden', 'activa'],
    description: 'Fechas de semestres y mesas de exámenes que se publican en /calendario-academico. El portal muestra el año más reciente.',
  },
  access: {
    read: readFlagOrInstitutional('activa'),
    create: canWriteInstitutional,
    update: canWriteInstitutional,
    delete: canWriteInstitutional,
  },
  fields: [
    {
      name: 'titulo',
      label: 'Título del bloque',
      type: 'text',
      required: true,
      maxLength: 120,
      admin: { description: 'Ej.: 1er Semestre 2026.' },
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select',
      required: true,
      defaultValue: 'semestre',
      options: [
        { label: 'Semestre', value: 'semestre' },
        { label: 'Mesas de exámenes finales', value: 'examenes' },
      ],
    },
    {
      name: 'anio',
      label: 'Año académico',
      type: 'number',
      required: true,
      min: 2000,
      max: 2100,
      admin: { step: 1, description: 'El portal muestra solo el año más reciente entre los bloques activos.' },
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number',
      defaultValue: 99,
      min: 0,
      admin: { step: 1, description: 'Número menor = aparece primero.' },
    },
    {
      name: 'activa',
      label: 'Activa',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Desmarque para ocultarlo del portal sin borrarlo.' },
    },
    {
      name: 'entradas',
      label: 'Fechas',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 40,
      admin: { description: 'Una fila por fecha o período, en el orden en que se muestran.' },
      fields: [
        {
          name: 'evento',
          label: 'Evento',
          type: 'select',
          options: [
            { label: 'Inicio de clases', value: 'inicio-clases' },
            { label: 'Período de inscripción tardía', value: 'inscripcion-tardia' },
            { label: 'Parciales, 1er turno', value: 'parciales-1' },
            { label: 'Parciales, 2do turno', value: 'parciales-2' },
            { label: 'Cierre del semestre', value: 'cierre-semestre' },
            { label: 'Otro (escriba la descripción)', value: 'otro' },
          ],
          validate: validateCalendarioEvento,
          admin: { description: 'Obligatorio en un semestre. En las mesas de exámenes se deja vacío: el período sale de las fechas.' },
        },
        {
          name: 'descripcion',
          label: 'Descripción',
          type: 'text',
          maxLength: 160,
          validate: validateCalendarioDescripcion,
          admin: { description: 'Solo si el evento es «Otro». Solo se publica en español.' },
        },
        {
          name: 'inicio',
          label: 'Fecha de inicio',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } },
        },
        {
          name: 'fin',
          label: 'Fecha de fin',
          type: 'date',
          validate: validateCalendarioFin,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' }, description: 'Opcional. Déjela vacía si es un solo día.' },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('calendario-academico')
      },
    ],
    // Borrar un bloque también debe refrescar el portal (no solo al guardar).
    afterDelete: [
      async () => {
        await revalidatePortalTag('calendario-academico')
      },
    ],
  },
}

