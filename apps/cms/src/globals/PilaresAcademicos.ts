// PILARES-01: pilares académicos (Docencia, Investigación, Extensión) editables desde el CMS.
// Spec: docs/specs/portal/PILARES-ACADEMICOS.md.
// Qué hace: guarda, por pilar, la tarjeta de la portada (título, bajada, descripción, ícono, hasta dos métricas y el texto
//   del botón) y su página (estado, contenido y estadísticas). El portal solo lo lee.
// Amenazas que evita: (1) cifras institucionales escritas en el código o cargadas sin fuente (una métrica toma su valor
//   de «Estadísticas» o exige la fuente); (2) un ícono o estado libres (listas cerradas); (3) escritura por roles sin
//   permiso de global; (4) cambios sin rastro (auditoría); (5) el portal sin refrescar (revalidación por etiqueta).
// Límites: el contenido es solo en español; la lectura es pública porque no contiene datos privados.
import type { Field, GlobalConfig, Tab } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { richTextEditor } from '../fields/richTextEditor'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'

type Sibling = { siblingData?: { origen?: unknown } }

const blank = (value: unknown) => typeof value !== 'string' || !value.trim()

/** Con origen «Estadísticas» hay que elegir la cifra. */
function validateEstadistica(value: unknown, options?: Sibling): true | string {
  return options?.siblingData?.origen === 'estadistica' && !value ? 'Elija la estadística que muestra esta métrica.' : true
}

/** Con origen «a mano» hace falta el valor. */
function validateValor(value: unknown, options?: Sibling): true | string {
  return options?.siblingData?.origen === 'manual' && blank(value) ? 'Escriba el valor (por ejemplo, 45).' : true
}

/** Con origen «a mano» hace falta la fuente: una cifra institucional sin respaldo no se publica. */
function validateFuente(value: unknown, options?: Sibling): true | string {
  return options?.siblingData?.origen === 'manual' && blank(value)
    ? 'Indique la fuente del dato (documento, informe o dependencia que lo respalda).'
    : true
}

/** Métrica: una cifra de «Estadísticas» o un valor cargado a mano con su fuente. */
const METRICA_FIELDS: Field[] = [
  {
    name: 'origen',
    label: 'Origen del dato',
    type: 'select',
    required: true,
    defaultValue: 'estadistica',
    options: [
      { label: 'Del global «Estadísticas»', value: 'estadistica' },
      { label: 'Cargado a mano (con fuente)', value: 'manual' },
    ],
  },
  {
    name: 'estadistica',
    label: 'Estadística',
    type: 'select',
    options: [
      { label: 'Estudiantes', value: 'totalEstudiantes' },
      { label: 'Docentes', value: 'totalDocentes' },
      { label: 'Egresados', value: 'totalEgresados' },
      { label: 'Carreras acreditadas', value: 'totalCarrerasAcreditadas' },
      { label: 'Facultades', value: 'totalFacultades' },
    ],
    validate: validateEstadistica as never,
    admin: { condition: (_, sibling) => sibling?.origen === 'estadistica', description: 'El número se actualiza solo cuando cambia «Estadísticas».' },
  },
  {
    name: 'valor',
    label: 'Valor',
    type: 'text',
    maxLength: 12,
    validate: validateValor as never,
    admin: { condition: (_, sibling) => sibling?.origen === 'manual', description: 'Ejemplo: «45» o «45+».' },
  },
  {
    name: 'fuente',
    label: 'Fuente del dato',
    type: 'text',
    maxLength: 200,
    validate: validateFuente as never,
    admin: { condition: (_, sibling) => sibling?.origen === 'manual', description: 'No se muestra en el portal; queda como respaldo del dato.' },
  },
  {
    name: 'etiqueta',
    label: 'Etiqueta',
    type: 'text',
    required: true,
    maxLength: 40,
    admin: { description: 'Ejemplo: «Carreras acreditadas».' },
  },
]

const ICONO_OPTIONS = [
  { label: 'Birrete (docencia)', value: 'birrete' },
  { label: 'Matraz (investigación)', value: 'matraz' },
  { label: 'Personas (extensión)', value: 'personas' },
]

/** Campos de un pilar: la tarjeta de la portada y su página. */
function pilarTab(name: 'docencia' | 'investigacion' | 'extension', label: string, icono: string, ruta: string): Tab {
  return {
    name,
    label,
    description: `Tarjeta en la portada y página ${ruta}.`,
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: 60 },
      { name: 'bajada', label: 'Bajada', type: 'text', maxLength: 60, admin: { description: 'Línea breve en mayúsculas bajo el título.' } },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true, maxLength: 260 },
      { name: 'icono', label: 'Ícono', type: 'select', required: true, defaultValue: icono, options: ICONO_OPTIONS },
      {
        name: 'metricas',
        label: 'Métricas de la tarjeta',
        labels: { singular: 'Métrica', plural: 'Métricas' },
        type: 'array',
        maxRows: 2,
        fields: METRICA_FIELDS,
        admin: { description: 'Hasta dos. Sin métricas válidas la tarjeta no muestra el recuadro de cifras.' },
      },
      { name: 'enlaceTexto', label: 'Texto del botón', type: 'text', required: true, maxLength: 40 },
      {
        name: 'pagina',
        label: `Página ${ruta}`,
        type: 'group',
        fields: [
          {
            name: 'estado',
            label: 'Estado de la página',
            type: 'select',
            required: true,
            defaultValue: 'construccion',
            options: [
              { label: 'En construcción (solo se muestra el aviso)', value: 'construccion' },
              { label: 'Publicada', value: 'publicada' },
            ],
          },
          { name: 'contenido', label: 'Contenido', type: 'richText', editor: richTextEditor },
          {
            name: 'estadisticas',
            label: 'Estadísticas de la página',
            labels: { singular: 'Estadística', plural: 'Estadísticas' },
            type: 'array',
            maxRows: 8,
            fields: METRICA_FIELDS,
          },
        ],
      },
    ],
  }
}

export const PilaresAcademicos: GlobalConfig = {
  slug: 'pilares-academicos',
  // Nombre corto en la base: con el slug completo los enumerados anidados superan los 63 caracteres de Postgres.
  dbName: 'pilares',
  label: 'Pilares académicos',
  admin: {
    group: 'Institucional',
    description: 'Tarjetas de Docencia, Investigación y Extensión en la portada, y la página de cada una.',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        pilarTab('docencia', 'Docencia', 'birrete', '/docencia'),
        pilarTab('investigacion', 'Investigación', 'matraz', '/investigacion'),
        pilarTab('extension', 'Extensión', 'personas', '/extension'),
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('pilares-academicos')
      },
      makeAuditGlobalAfterChange('pilares-academicos', 'Pilares académicos'),
    ],
  },
}
