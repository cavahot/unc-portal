// INST-01: contenido del hub /institucional (La Institución) editable desde el CMS. Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.2.
// Qué hace: guarda en la base de datos lo que antes estaba en los archivos de mensajes (quiénes somos con sus datos,
// las tarjetas de sección y los valores institucionales); el portal solo lo lee.
// Amenazas que evita: (1) datos fijos que nadie puede corregir sin desplegar; (2) tarjetas que enlacen a rutas
// inexistentes o a sitios ajenos (el destino es una LISTA CERRADA, no una URL libre); (3) secciones repetidas;
// (4) cambios sin rastro (auditoría); (5) escritura por roles sin permiso de global.
// Límites: el contenido es solo en español; si se crea una sección nueva en el portal hay que sumarla a DESTINOS
// (CMS) y a `lib/cms/institucional.ts` (portal); un test comprueba que ambas listas coincidan.
import type { GlobalConfig } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'

const MAX_TITULO = 120
const MAX_TEXTO = 500

/** Destinos que una tarjeta puede enlazar: son rutas reales del portal (se traducen a ruta en `lib/cms/institucional.ts`). */
export const DESTINOS = [
  'historia',
  'mision-vision-y-valores',
  'autoridades',
  'organigrama',
  'marco-legal',
  'aseguramiento-calidad',
  'transparencia',
  'informacion-publica',
] as const

const DESTINO_LABELS: Record<(typeof DESTINOS)[number], string> = {
  historia: 'Historia',
  'mision-vision-y-valores': 'Misión, visión y valores',
  autoridades: 'Autoridades',
  organigrama: 'Organigrama',
  'marco-legal': 'Marco legal',
  'aseguramiento-calidad': 'Aseguramiento de la calidad',
  transparencia: 'Transparencia',
  'informacion-publica': 'Información pública',
}

/** Un destino repetido mostraría dos tarjetas idénticas hacia la misma página. */
function validateDestinosUnicos(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  const seen = new Set<string>()
  for (const row of value as Array<{ destino?: unknown }>) {
    const d = typeof row?.destino === 'string' ? row.destino : ''
    if (!d) continue
    if (seen.has(d)) return `El destino «${d}» está repetido: cada sección necesita un destino distinto.`
    seen.add(d)
  }
  return true
}

export const Institucional: GlobalConfig = {
  slug: 'institucional',
  label: 'La Institución',
  admin: {
    group: 'Institucional',
    description: 'Contenido del hub /institucional: presentación, datos de la universidad, tarjetas de sección y valores.',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    { name: 'titulo', label: 'Título de la página', type: 'text', required: true, maxLength: MAX_TITULO, admin: { description: 'Ejemplo: «La Institución».' } },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true, maxLength: 400, admin: { description: 'Resumen bajo el título (máximo 400 caracteres).' } },
    {
      name: 'sobre',
      label: 'Quiénes somos',
      type: 'group',
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: MAX_TITULO },
        { name: 'texto', label: 'Texto', type: 'textarea', required: true, maxLength: 800 },
        {
          name: 'datos',
          label: 'Datos clave',
          type: 'array',
          minRows: 1,
          maxRows: 4,
          admin: { initCollapsed: true, description: 'De 1 a 4 pares valor/etiqueta. Ejemplo: «2007» / «Año de fundación».' },
          fields: [
            { name: 'valor', label: 'Valor', type: 'text', required: true, maxLength: 40 },
            { name: 'etiqueta', label: 'Etiqueta', type: 'text', required: true, maxLength: 60 },
          ],
        },
      ],
    },
    {
      name: 'secciones',
      label: 'Secciones',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      validate: validateDestinosUnicos,
      admin: { initCollapsed: true, description: 'Tarjetas que llevan a otras páginas. El orden del panel es el orden en la página.' },
      fields: [
        {
          name: 'destino',
          label: 'Destino',
          type: 'select',
          required: true,
          // Lista cerrada a propósito: una URL libre podría apuntar a una ruta inexistente o a un sitio ajeno.
          options: DESTINOS.map((value) => ({ label: DESTINO_LABELS[value], value })),
        },
        { name: 'etiqueta', label: 'Etiqueta corta', type: 'text', required: true, maxLength: 40 },
        { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: MAX_TITULO },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true, maxLength: MAX_TEXTO },
        { name: 'accion', label: 'Texto del enlace', type: 'text', required: true, maxLength: 60, admin: { description: 'Ejemplo: «Ver historia».' } },
      ],
    },
    {
      name: 'valores',
      label: 'Valores institucionales',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      admin: { initCollapsed: true },
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: MAX_TITULO },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true, maxLength: MAX_TEXTO },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('institucional')
      },
      makeAuditGlobalAfterChange('institucional', 'La Institución'),
    ],
  },
}
