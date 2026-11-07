// TITULOS-01: contenido de /titulos (Inscripción de títulos) editable desde el CMS. Spec: docs/specs/portal/TITULOS.md.
// Qué hace: guarda en la base de datos lo que antes estaba escrito en el código de la página (tipos de universidad
// con sus requisitos, pasos del procedimiento, plazo y nota del CONES) y enlaza el arancel con la fila que ya existe
// en `aranceles-rectorado`; el portal solo lo lee.
// Amenazas que evita: (1) datos fijos que nadie puede corregir sin desplegar; (2) dos fuentes del arancel que
// divergen (el monto NO se guarda aquí); (3) un `acento` libre que inyecte CSS (lista cerrada); (4) una nota del CONES
// que lleve a un sitio ajeno (host exacto); (5) cambios sin rastro (hook de auditoría); (6) escritura por roles sin
// permiso de global.
// Límites: el contenido es solo en español (las demás lenguas traducen la interfaz del portal); la lectura es
// pública porque el global no contiene datos privados.
import type { GlobalConfig } from 'payload'

import { canUpdateGlobal } from '../access/roles'
import { makeAuditGlobalAfterChange } from '../hooks/audit/auditGlobalChange'
import { revalidatePortalTag } from '../utilities/revalidation'
import { validateConesUrl } from '../utilities/validators'

const MAX_TITULO = 120
const MAX_DESCRIPCION = 400
const MAX_REQUISITO = 600
const MAX_PASO = 800

/** Ayuda para el editor: solo letras minúsculas, números y guiones (identifica el tipo en la URL y en el CMS). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type Sibling = { siblingData?: { plazoMinHoras?: unknown } }

/** Entero ≥ 1 y obligatorio. Sustituye a la validación por defecto de `number`, que un `validate` propio reemplaza. */
function validateHoras(value: unknown): true | string {
  if (value === undefined || value === null || value === '') return 'Indique las horas.'
  if (typeof value !== 'number' || !Number.isInteger(value)) return 'Debe ser un número entero de horas.'
  if (value < 1) return 'Debe ser al menos 1 hora.'
  return true
}

/** El plazo máximo no puede ser menor que el mínimo (se mostraría un rango invertido como «24 a 8 horas»). */
function validatePlazoMax(value: unknown, options?: Sibling): true | string {
  const base = validateHoras(value)
  if (base !== true) return base
  const min = options?.siblingData?.plazoMinHoras
  if (typeof min === 'number' && (value as number) < min) return 'El plazo máximo no puede ser menor que el mínimo.'
  return true
}

/** Dos tipos de universidad con el mismo slug se pisarían entre sí en el portal; se compara sin mayúsculas. */
function validateTiposUnicos(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  const seen = new Set<string>()
  for (const row of value as Array<{ slug?: unknown }>) {
    const slug = typeof row?.slug === 'string' ? row.slug.trim().toLowerCase() : ''
    if (!slug) continue
    if (seen.has(slug)) return `El slug «${slug}» está repetido: cada tipo de universidad necesita un slug distinto.`
    seen.add(slug)
  }
  return true
}

function validateSlug(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) return 'Indique el slug.'
  if (!SLUG_PATTERN.test(value.trim().toLowerCase())) return 'Use solo letras minúsculas, números y guiones (por ejemplo: universidad-extranjera).'
  return true
}

export const TitulosInscripcion: GlobalConfig = {
  slug: 'titulos-inscripcion',
  label: 'Inscripción de títulos',
  admin: {
    group: 'Trámites',
    description:
      'Contenido de la página /titulos: tipos de universidad y sus requisitos, pasos del procedimiento, plazo y nota del CONES. El arancel se toma de «Aranceles del Rectorado».',
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
      admin: { description: 'Encabezado principal. Ejemplo: «Inscripción de títulos».' },
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: true,
      maxLength: MAX_DESCRIPCION,
      admin: { description: 'Resumen del servicio que aparece bajo el título (máximo 400 caracteres).' },
    },
    {
      name: 'unidad',
      label: 'Unidad responsable',
      type: 'text',
      required: true,
      maxLength: MAX_TITULO,
      admin: { description: 'Dependencia que tramita la inscripción. Ejemplo: «Secretaría General — UNC».' },
    },
    {
      name: 'plazoMinHoras',
      label: 'Plazo mínimo (horas hábiles)',
      type: 'number',
      required: true,
      min: 1,
      validate: validateHoras,
      admin: { step: 1, description: 'Número entero de horas hábiles. Ejemplo: 8.' },
    },
    {
      name: 'plazoMaxHoras',
      label: 'Plazo máximo (horas hábiles)',
      type: 'number',
      required: true,
      min: 1,
      validate: validatePlazoMax,
      admin: { step: 1, description: 'Número entero, igual o mayor que el mínimo. Ejemplo: 24.' },
    },
    {
      name: 'arancel',
      label: 'Arancel',
      type: 'relationship',
      relationTo: 'aranceles-rectorado',
      // Solo filas publicadas: elegir una inactiva dejaría la tarjeta del arancel sin monto en el portal.
      filterOptions: { active: { equals: true } },
      admin: {
        description:
          'Elija la fila de «Aranceles del Rectorado» (por ejemplo «Inscripción de Títulos Universitarios»). El monto se toma de allí: no se escribe en esta página.',
      },
    },
    {
      name: 'notaCones',
      label: 'Nota del CONES',
      type: 'group',
      admin: { description: 'Aviso sobre el reconocimiento previo de títulos extranjeros. Déjelo vacío si no corresponde.' },
      fields: [
        {
          name: 'texto',
          label: 'Texto',
          type: 'textarea',
          maxLength: MAX_REQUISITO,
          admin: { description: 'Qué debe saber la persona antes de presentarse.' },
        },
        {
          name: 'url',
          label: 'Enlace al CONES',
          type: 'text',
          maxLength: 300,
          validate: (value: unknown) => validateConesUrl(value),
          admin: { description: 'Solo https://www.cones.gov.py o https://cones.gov.py.' },
        },
      ],
    },
    {
      name: 'tipos',
      label: 'Tipos de universidad',
      type: 'array',
      validate: validateTiposUnicos,
      admin: {
        initCollapsed: true,
        description: 'Cada tipo (extranjera, nacional pública, nacional privada) con los documentos que debe presentar. El orden del panel es el orden en la página.',
      },
      fields: [
        {
          name: 'slug',
          label: 'Identificador (slug)',
          type: 'text',
          required: true,
          maxLength: 40,
          validate: validateSlug,
          admin: { description: 'Letras minúsculas, números y guiones. Debe ser único. Ejemplo: universidad-extranjera.' },
        },
        {
          name: 'etiqueta',
          label: 'Etiqueta corta',
          type: 'text',
          required: true,
          maxLength: 40,
          admin: { description: 'Rótulo breve sobre el título. Ejemplo: «Internacional».' },
        },
        {
          name: 'titulo',
          label: 'Título',
          type: 'text',
          required: true,
          maxLength: MAX_TITULO,
          admin: { description: 'Ejemplo: «Universidades extranjeras».' },
        },
        {
          name: 'subtitulo',
          label: 'Subtítulo',
          type: 'text',
          maxLength: MAX_TITULO,
          admin: { description: 'Ejemplo: «Títulos de grado y/o posgrado».' },
        },
        {
          name: 'acento',
          label: 'Color de acento',
          type: 'select',
          required: true,
          defaultValue: 'verde',
          // Lista cerrada a propósito: un color libre llegaría a un atributo `style` del portal (inyección de CSS).
          options: [
            { label: 'Verde', value: 'verde' },
            { label: 'Azul', value: 'azul' },
            { label: 'Violeta', value: 'violeta' },
          ],
          admin: { description: 'Solo estos tres colores; el portal los aplica con su propia paleta.' },
        },
        {
          name: 'requisitos',
          label: 'Requisitos',
          type: 'array',
          admin: { initCollapsed: true, description: 'Un documento o condición por fila, en el orden en que se muestran.' },
          fields: [
            {
              name: 'texto',
              label: 'Requisito',
              type: 'textarea',
              required: true,
              maxLength: MAX_REQUISITO,
              admin: { description: 'Máximo 600 caracteres.' },
            },
          ],
        },
      ],
    },
    {
      name: 'pasos',
      label: 'Pasos del procedimiento',
      type: 'array',
      admin: {
        initCollapsed: true,
        description: 'En orden: el número del paso lo pone el portal según la posición en esta lista.',
      },
      fields: [
        {
          name: 'responsable',
          label: 'Responsable',
          type: 'text',
          required: true,
          maxLength: MAX_TITULO,
          admin: { description: 'Quién realiza el paso. Ejemplo: «Mesa de Entrada / Atención al Usuario».' },
        },
        {
          name: 'descripcion',
          label: 'Descripción',
          type: 'textarea',
          required: true,
          maxLength: MAX_PASO,
          admin: { description: 'Qué ocurre en este paso (máximo 800 caracteres).' },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        await revalidatePortalTag('titulos-inscripcion')
      },
      makeAuditGlobalAfterChange('titulos-inscripcion', 'Inscripción de títulos'),
    ],
  },
}
