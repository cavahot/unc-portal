/**
 * seed-institucional.mjs — INST-01
 *
 * Carga idempotente del contenido hoy publicado en dos páginas, en sus globals del CMS:
 *   - `informacion-publica`: las 3 vías de solicitud, los 7 datos requeridos, la cita de la Ley N° 5282, el portal
 *     oficial y el correo (estaban escritos en `app/[locale]/informacion-publica/page.tsx`).
 *   - `institucional`: quiénes somos con sus 3 datos clave, 4 secciones y 4 valores (estaban en `messages/es`).
 * Desde INST-01 el CMS es la fuente y este archivo solo siembra el estado inicial.
 * Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2 y criterios 1-6.
 *
 * Uso:
 *   node scripts/seed-institucional.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-institucional.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones del editor al re-ejecutar -> si un global ya tiene título se OMITE y nunca se modifica.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política
 *     de destino y credenciales que la siembra del glosario (`openCmsSession`).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 * Límite: no actualiza un global con contenido; para cambiarlo use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'

/** Contenido real hoy publicado en /informacion-publica. Redacción neutra, sin voseo. */
export const INFORMACION_PUBLICA_SEED = {
  titulo: 'Acceso a la información pública',
  descripcion:
    'La Universidad Nacional de Concepción garantiza el derecho de acceso a la información pública. Elija la vía que le resulte más conveniente.',
  leyReferencia: 'Ley N° 5282/2014 — Libre Acceso a la Información Pública',
  cita: {
    texto:
      'Toda persona interesada en acceder a la información pública, deberá presentar una solicitud ante la oficina establecida en la fuente pública correspondiente, personalmente, por correo electrónico, en forma escrita o verbal, y en este último caso, se extenderá un acta. La presentación contendrá la identificación del solicitante, su domicilio real, la descripción clara y precisa de la información pública que requiere, y finalmente, el formato o soporte preferido.',
    fuente: 'Ley N° 5282/2014, art. 12',
  },
  vias: [
    {
      slug: 'solicitud-online',
      etiqueta: 'Vía digital',
      titulo: 'Solicitud online',
      descripcion:
        'Acceda directamente al Portal Unificado de Acceso a la Información Pública del Gobierno Nacional. Complete el formulario en línea con sus datos y la descripción de la información requerida.',
      destacada: true,
      accion: { texto: 'Solicitar información online', url: 'https://informacionpublica.paraguay.gov.py/#!/' },
    },
    {
      slug: 'presencial',
      etiqueta: 'Vía presencial',
      titulo: 'En persona',
      descripcion:
        'Acuda personalmente o comuníquese con la Oficina de Acceso a la Información de la UNC. Un funcionario registrará su solicitud mediante acta, conforme al art. 12 de la Ley N° 5282.',
      destacada: false,
      accion: { texto: 'Ver información de contacto', url: '/contacto' },
    },
    {
      slug: 'correo',
      etiqueta: 'Vía correo',
      titulo: 'Por correo electrónico',
      descripcion:
        'Envíe su solicitud por correo electrónico a la oficina de acceso a la información correspondiente. Las direcciones de todas las oficinas figuran en el catálogo oficial del Gobierno.',
      destacada: false,
      accion: { texto: 'Ver catálogo de oficinas', url: 'https://informacionpublica.paraguay.gov.py/#!/estadistica/catalogo-institucion' },
    },
  ],
  datosRequeridos: [
    { texto: 'Nombres y apellidos completos' },
    { texto: 'Correo electrónico de contacto' },
    { texto: 'Nacionalidad' },
    { texto: 'Domicilio real' },
    { texto: 'Teléfono de contacto (opcional)' },
    { texto: 'Descripción clara y precisa de la información requerida' },
    { texto: 'Formato o soporte preferido para la respuesta' },
  ],
  portalOficial: {
    titulo: 'Portal Unificado del Gobierno Nacional',
    descripcion:
      'El Portal de Acceso a la Información Pública de Paraguay es la plataforma oficial donde se puede realizar la solicitud en línea, consultar el estado de trámites anteriores y acceder al catálogo de instituciones públicas.',
    url: 'https://informacionpublica.paraguay.gov.py/#!/',
  },
  correo: 'secgral@unc.edu.py',
}

/** Contenido real hoy publicado en /institucional (de `messages/es/pages.institucional.json`). */
export const INSTITUCIONAL_SEED = {
  titulo: 'La Institución',
  descripcion:
    'Una universidad pública, comprometida con el desarrollo sostenible del norte del Paraguay, con más de una década formando profesionales de excelencia.',
  sobre: {
    titulo: 'Una universidad con identidad propia',
    texto:
      'La Universidad Nacional de Concepción fue creada por la Ley N° 3.201/2007 y es la única universidad pública del norte del Paraguay. Su misión es formar profesionales con valores éticos, pensamiento crítico e impacto social.',
    datos: [
      { valor: '2007', etiqueta: 'Año de fundación' },
      { valor: 'Concepción, PY', etiqueta: 'Sede principal' },
      { valor: 'Pública', etiqueta: 'Tipo de institución' },
    ],
  },
  secciones: [
    {
      destino: 'historia',
      etiqueta: 'Trayectoria',
      titulo: 'Historia',
      descripcion: 'Desde su fundación en 2007, la UNC ha crecido hasta convertirse en el referente de educación superior del norte paraguayo.',
      accion: 'Ver historia',
    },
    {
      destino: 'mision-vision-y-valores',
      etiqueta: 'Propósito institucional',
      titulo: 'Misión y Visión',
      descripcion: 'El propósito, los valores y la visión de futuro que guían cada decisión de la Universidad.',
      accion: 'Ver misión y visión',
    },
    {
      destino: 'autoridades',
      etiqueta: 'Gobierno universitario',
      titulo: 'Autoridades',
      descripcion: 'El Rector, el Consejo Superior y las autoridades de cada facultad que conducen la institución.',
      accion: 'Ver autoridades',
    },
    {
      destino: 'organigrama',
      etiqueta: 'Estructura institucional',
      titulo: 'Organigrama',
      descripcion: 'La estructura organizacional completa de la Universidad Nacional de Concepción.',
      accion: 'Ver organigrama',
    },
  ],
  valores: [
    { titulo: 'Excelencia académica', descripcion: 'Compromiso permanente con la calidad en la formación profesional y la producción de conocimiento.' },
    { titulo: 'Inclusión', descripcion: 'Igualdad de oportunidades para todos los estudiantes, sin distinción de origen o condición.' },
    { titulo: 'Innovación', descripcion: 'Fomento de la investigación aplicada y el pensamiento creativo para resolver desafíos reales.' },
    { titulo: 'Compromiso social', descripcion: 'Vinculación activa con la comunidad de Concepción y el norte del Paraguay.' },
  ],
}

/**
 * INST-02: enlace del formulario de /solicitar-titulo. Antes estaba escrito en el código de la página; ahora la
 * página lo lee del global `enlaces-externos` (sin respaldo en el código), así que se siembra el mismo valor.
 * Solo se envía este campo: `urlPortalInfoPublica` y `contenidoInfoPublica` del mismo global no se tocan.
 */
export const ENLACES_EXTERNOS_SEED = {
  formularioTitulos: 'https://docs.google.com/forms/d/e/1FAIpQLSekLymnL6bc1Gg2mWFflwKTR0VW4Ui3Y6CkDAm8NtgTsSI0pA/viewform',
}

/** Globals que siembra este guion: `slug` del CMS, documento inicial y criterio de «ya tiene contenido». */
export const GLOBALS = [
  { slug: 'informacion-publica', label: 'Información pública', seed: INFORMACION_PUBLICA_SEED, filled: hasContent },
  { slug: 'institucional', label: 'La Institución', seed: INSTITUCIONAL_SEED, filled: hasContent },
  { slug: 'enlaces-externos', label: 'Enlaces externos', seed: ENLACES_EXTERNOS_SEED, filled: hasFormulario },
]

/** El global «tiene contenido» si el editor ya cargó un título (no se pisa nunca). */
export function hasContent(doc) {
  return Boolean(doc && typeof doc === 'object' && typeof doc.titulo === 'string' && doc.titulo.trim())
}

/** `enlaces-externos` está cargado si el editor ya puso la URL del formulario (no se pisa nunca). */
export function hasFormulario(doc) {
  return Boolean(doc && typeof doc === 'object' && typeof doc.formularioTitulos === 'string' && doc.formularioTitulos.trim())
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch y log (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    for (const g of GLOBALS) log(`[dry-run] ${g.slug}: ${Object.keys(g.seed).length} campos de primer nivel`)
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  for (const g of GLOBALS) {
    const current = await api('GET', `globals/${g.slug}?depth=0`)
    if (!current.ok) {
      counts.errores++
      log(`  ! ${g.slug}: no se pudo leer el global (HTTP ${current.status}).`)
      continue
    }
    if (g.filled(current.data)) {
      counts.omitidos++
      log(`  = ${g.slug}: omitido, ya tiene contenido (no se modifica).`)
      continue
    }
    const r = await api('POST', `globals/${g.slug}`, g.seed)
    if (r.ok) {
      counts.creados++
      log(`  + ${g.slug}: contenido sembrado.`)
    } else {
      counts.errores++
      log(`  ! ${g.slug}: falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { dryRun: false, counts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  if (args.includes('--apply') && args.includes('--dry-run')) {
    console.error('Error: --apply y --dry-run se excluyen.')
    process.exit(1)
  }
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote') })
    .then((result) => {
      if (result.counts.errores > 0) process.exitCode = 1
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    })
}
