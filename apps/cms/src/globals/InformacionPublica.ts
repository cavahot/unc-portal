// INST-01: contenido de /informacion-publica (Ley N° 5282/2014) editable desde el CMS. Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1.
// Qué hace: guarda en la base de datos lo que antes estaba escrito en el código de la página (las vías para solicitar
// información, los datos que debe aportar la persona, la cita de la ley, el portal oficial y el correo de la oficina);
// el portal solo lo lee.
// Amenazas que evita: (1) datos fijos que nadie puede corregir sin desplegar; (2) un enlace editable que lleve a un
// sitio ajeno o use `javascript:` (solo ruta interna o https del portal oficial); (3) vías con el mismo identificador
// que se pisarían; (4) cambios sin rastro (hook de auditoría); (5) escritura por roles sin permiso de global.
// Límites: el contenido es solo en español (las demás lenguas traducen la interfaz); la lectura es pública porque el
// global no contiene datos privados.
import type { GlobalConfig } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateAllowedHostUrl, validateInfoPublicaUrl, INFO_PUBLICA_HOSTS } from '../utilities/validators'

const MAX_TITULO = 120
const MAX_DESCRIPCION = 500
const MAX_CITA = 800
const MAX_DATO = 200
const MAX_VIAS = 6
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function validateSlug(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) return 'Indique el identificador.'
  if (!SLUG_PATTERN.test(value.trim().toLowerCase())) return 'Use solo letras minúsculas, números y guiones (por ejemplo: solicitud-online).'
  return true
}

/** Dos vías con el mismo identificador se confundirían en la página; se compara sin mayúsculas. */
function validateViasUnicas(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  if (value.length > MAX_VIAS) return `Máximo ${MAX_VIAS} vías.`
  const seen = new Set<string>()
  for (const row of value as Array<{ slug?: unknown }>) {
    const slug = typeof row?.slug === 'string' ? row.slug.trim().toLowerCase() : ''
    if (!slug) continue
    if (seen.has(slug)) return `El identificador «${slug}» está repetido: cada vía necesita uno distinto.`
    seen.add(slug)
  }
  return true
}

export const InformacionPublica: GlobalConfig = {
  slug: 'informacion-publica',
  label: 'Información pública',
  admin: {
    group: 'Transparencia',
    description:
      'Contenido de la página /informacion-publica: vías para solicitar información (Ley N° 5282), datos que debe aportar la persona, portal oficial y correo de la oficina.',
  },
  access: {
    read: () => true,
    update: canUpdateGlobal,
  },
  fields: [
    {
      name: 'titulo',
      label: 'Título de la página',
      type: 'text',
      required: true,
      maxLength: MAX_TITULO,
      admin: { description: 'Encabezado principal. Ejemplo: «Acceso a la información pública».' },
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: true,
      maxLength: MAX_DESCRIPCION,
      admin: { description: 'Resumen que aparece bajo el título (máximo 500 caracteres).' },
    },
    {
      name: 'leyReferencia',
      label: 'Ley de referencia',
      type: 'text',
      required: true,
      maxLength: 160,
      admin: { description: 'Ejemplo: «Ley N° 5282/2014 — Libre Acceso a la Información Pública».' },
    },
    {
      name: 'cita',
      label: 'Cita de la ley',
      type: 'group',
      admin: { description: 'Texto de la norma que sustenta cómo presentar la solicitud. Déjelo vacío si no corresponde.' },
      fields: [
        { name: 'texto', label: 'Texto', type: 'textarea', maxLength: MAX_CITA },
        { name: 'fuente', label: 'Fuente', type: 'text', maxLength: 160, admin: { description: 'Ejemplo: «Ley N° 5282/2014, art. 12».' } },
      ],
    },
    {
      name: 'vias',
      label: 'Vías de solicitud',
      type: 'array',
      validate: validateViasUnicas,
      admin: { initCollapsed: true, description: 'Cada forma de presentar la solicitud. El orden del panel es el orden en la página.' },
      fields: [
        {
          name: 'slug',
          label: 'Identificador',
          type: 'text',
          required: true,
          maxLength: 40,
          validate: validateSlug,
          admin: { description: 'Letras minúsculas, números y guiones. Único. Ejemplo: solicitud-online.' },
        },
        { name: 'etiqueta', label: 'Etiqueta corta', type: 'text', required: true, maxLength: 40, admin: { description: 'Ejemplo: «Vía digital».' } },
        { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: MAX_TITULO },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', required: true, maxLength: MAX_DESCRIPCION },
        {
          name: 'destacada',
          label: 'Vía recomendada',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Marca la vía más rápida con un rótulo fijo de la interfaz (no es texto libre).' },
        },
        {
          name: 'accion',
          label: 'Acción',
          type: 'group',
          fields: [
            { name: 'texto', label: 'Texto del botón', type: 'text', required: true, maxLength: 80 },
            {
              name: 'url',
              label: 'Enlace',
              type: 'text',
              required: true,
              maxLength: 300,
              validate: (value: unknown) => validateInfoPublicaUrl(value),
              admin: { description: 'Una ruta interna (p. ej. /contacto) o un https del portal oficial del Gobierno.' },
            },
          ],
        },
      ],
    },
    {
      name: 'datosRequeridos',
      label: 'Datos que debe aportar la persona',
      type: 'array',
      admin: { initCollapsed: true, description: 'Un dato por fila, en el orden en que se muestran.' },
      fields: [{ name: 'texto', label: 'Dato', type: 'text', required: true, maxLength: MAX_DATO }],
    },
    {
      name: 'portalOficial',
      label: 'Portal oficial del Gobierno',
      type: 'group',
      admin: { description: 'Plataforma nacional para presentar la solicitud en línea. Déjelo vacío si no corresponde.' },
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', maxLength: MAX_TITULO },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: MAX_DESCRIPCION },
        {
          name: 'url',
          label: 'Enlace',
          type: 'text',
          maxLength: 300,
          validate: (value: unknown) => validateAllowedHostUrl(value, { allowedHosts: INFO_PUBLICA_HOSTS, required: false }),
          admin: { description: `Solo https de: ${INFO_PUBLICA_HOSTS.join(', ')}.` },
        },
      ],
    },
    {
      name: 'correo',
      label: 'Correo de la oficina',
      type: 'email',
      required: true,
      admin: { description: 'Dirección para solicitudes escritas. Ejemplo: secgral@unc.edu.py.' },
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('informacion-publica')
      },
      makeAuditGlobalAfterChange('informacion-publica', 'Información pública'),
    ],
  },
}
