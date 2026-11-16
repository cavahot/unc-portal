/**
 * seed-titulos.mjs — TITULOS-01
 *
 * Carga idempotente del contenido de /titulos (Inscripción de títulos) en el global `titulos-inscripcion`:
 * 3 tipos de universidad con sus requisitos, 8 pasos del procedimiento, plazo de 8 a 24 horas hábiles y la nota del
 * CONES. Es el contenido que estaba escrito en `app/[locale]/titulos/page.tsx`; desde TITULOS-01 el CMS es la fuente
 * y este archivo solo siembra el estado inicial. El arancel NO se carga aquí: se enlaza la fila que ya existe en
 * `aranceles-rectorado` (concepto «Inscripción de Títulos Universitarios»).
 * Spec: docs/specs/portal/TITULOS.md §2.4.
 *
 * Uso:
 *   node scripts/seed-titulos.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-titulos.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones del editor al re-ejecutar -> si el global ya tiene título, tipos o pasos se OMITE y nunca se
 *     modifica.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 *   - Dos fuentes del arancel -> se guarda la relación (id de la fila), nunca el monto.
 * Límite: no actualiza un global con contenido; para cambiarlo use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'

/** Concepto de la fila de `aranceles-rectorado` que se enlaza (el de scripts/lib/arancelesSeedData.mjs). */
export const ARANCEL_CONCEPTO = 'Inscripción de Títulos Universitarios'

const DOC_ORIGINAL = 'Título académico original en formato digital (escaneado) y físico'
const CEDULA = 'Paraguayos: fotocopia simple de Cédula de Identidad Civil.'
const EXTRANJEROS = 'Extranjeros: fotocopia simple de Pasaporte, Documento de Identidad, o Carnet de Residencia legalmente reconocido en el país.'
const ORIGEN = 'Identificación del domicilio, teléfono y fax de la Universidad de origen.'

/** Contenido real hoy publicado en /titulos (sin el arancel, que se enlaza). Redacción neutra, sin voseo. */
export const TITULOS_SEED = {
  titulo: 'Inscripción de títulos',
  descripcion:
    'Servicio de inscripción y registro de títulos académicos expedidos por universidades extranjeras, nacionales públicas y nacionales privadas ante la Secretaría General de la UNC.',
  unidad: 'Secretaría General — UNC',
  plazoMinHoras: 8,
  plazoMaxHoras: 24,
  notaCones: {
    texto:
      'Títulos extranjeros: el reconocimiento por el CONES (Consejo Nacional de Educación Superior) es un requisito previo indispensable. Consulte los trámites en cones.gov.py.',
    url: 'https://www.cones.gov.py/',
  },
  tipos: [
    {
      slug: 'extranjera',
      etiqueta: 'Internacional',
      titulo: 'Universidades extranjeras',
      subtitulo: 'Títulos de grado y/o posgrado',
      acento: 'verde',
      requisitos: [
        {
          texto: `${DOC_ORIGINAL}, debidamente reconocido por el CONES, registrado y legalizado por el MEC, y legalizado por el MRE de la República del Paraguay, o con apostillado de La Haya, según corresponda.`,
        },
        { texto: CEDULA },
        { texto: EXTRANJEROS },
        { texto: 'Traducción oficial de los documentos que estén en idioma diferente al castellano.' },
        { texto: ORIGEN },
      ],
    },
    {
      slug: 'publica',
      etiqueta: 'Nacional pública',
      titulo: 'Universidades nacionales públicas',
      subtitulo: 'Títulos de grado y/o posgrado',
      acento: 'azul',
      requisitos: [
        { texto: `${DOC_ORIGINAL}, debidamente registrado y legalizado por el Ministerio de Educación y Ciencias (MEC).` },
        { texto: CEDULA },
        { texto: EXTRANJEROS },
        { texto: ORIGEN },
      ],
    },
    {
      slug: 'privada',
      etiqueta: 'Nacional privada',
      titulo: 'Universidades nacionales privadas',
      subtitulo: 'Títulos de grado y/o posgrado',
      acento: 'violeta',
      requisitos: [
        { texto: `${DOC_ORIGINAL}, debidamente registrado y legalizado por el Ministerio de Educación y Ciencias (MEC).` },
        { texto: CEDULA },
        { texto: EXTRANJEROS },
        { texto: ORIGEN },
      ],
    },
  ],
  pasos: [
    { responsable: 'Recurrente', descripcion: 'Presentación de las documentaciones (formato digital o físico) requeridas en Secretaría General del Rectorado.' },
    {
      responsable: 'Mesa de Entrada / Atención al Usuario',
      descripcion: 'Presentados los documentos, se proveerá de una contraseña para proceder al pago de los aranceles correspondientes.',
    },
    { responsable: 'Perceptoría – Recurrente', descripcion: 'Pago de los aranceles correspondientes.' },
    {
      responsable: 'Mesa de Entrada / Atención al Usuario',
      descripcion: 'Se deriva el legajo a la Secretaría General para los procesos de control e inscripción en el Libro correspondiente.',
    },
    {
      responsable: 'Asistente de Secretaría General',
      descripcion: 'En caso de encontrarse alguna incorrección en el legajo, se comunica a Mesa de Entrada para notificar al afectado.',
    },
    {
      responsable: 'Asistente de Secretaría General',
      descripcion:
        'Culminados los controles y estando las documentaciones en regla, se procede a la inscripción en los registros previa firma digital o firma y sello del Secretario General de la UNC, y se devuelve a Mesa de Entrada hasta su retiro.',
    },
    {
      responsable: 'Mesa de Entrada / Atención al Usuario',
      descripcion: 'Entrega de los documentos inscriptos al recurrente, previa presentación de la contraseña y comprobante de pago de aranceles.',
    },
    { responsable: 'Asistente de Secretaría General', descripcion: 'Archivo final de la contraseña y legajo.' },
  ],
}

/** Documento a escribir. Con `arancelId` enlaza la fila de aranceles; sin él, omite la relación (nunca un monto). */
export function plannedDocument(arancelId) {
  return { ...TITULOS_SEED, ...(arancelId != null ? { arancel: arancelId } : {}) }
}

/** true solo para hosts de desarrollo local. */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/** El global «tiene contenido» si el editor ya cargó título, algún tipo o algún paso (no se pisa nunca). */
function hasContent(doc) {
  if (!doc || typeof doc !== 'object') return false
  return Boolean(
    (typeof doc.titulo === 'string' && doc.titulo.trim()) ||
      (Array.isArray(doc.tipos) && doc.tipos.length > 0) ||
      (Array.isArray(doc.pasos) && doc.pasos.length > 0),
  )
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y pace (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (!apply) {
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] contenido: ${TITULOS_SEED.tipos.length} tipos de universidad, ${TITULOS_SEED.pasos.length} pasos, plazo ${TITULOS_SEED.plazoMinHoras}–${TITULOS_SEED.plazoMaxHoras} h.`)
    return { dryRun: true, counts: { tipos: TITULOS_SEED.tipos.length, pasos: TITULOS_SEED.pasos.length } }
  }

  if (!isLocalCmsUrl(cmsUrl)) {
    if (!allowRemote) throw new Error(`Este guion solo escribe en un CMS local; destino rechazado: ${cmsUrl}. Use --allow-remote para un destino https explícito.`)
    if (new URL(cmsUrl).protocol !== 'https:') throw new Error('Con --allow-remote el CMS debe usar https.')
  }
  const email = (env.CMS_EMAIL || '').trim()
  if (!email) throw new Error('Falta CMS_EMAIL (usuario superadmin o web-admin).')
  const password = requireCmsPassword(env)

  const loginRes = await doFetch(`${cmsUrl}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const login = await loginRes.json().catch(() => ({}))
  if (!login.token) throw new Error(`No se pudo iniciar sesión en el CMS (HTTP ${loginRes.status}).`)
  const headers = { 'Content-Type': 'application/json', Authorization: `JWT ${login.token}` }
  log(`Sesión iniciada en ${cmsUrl}`)

  const api = async (method, endpoint, body) => {
    const res = await doFetch(`${cmsUrl}/api/${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  const counts = { creados: 0, omitidos: 0, errores: 0 }

  const current = await api('GET', 'globals/titulos-inscripcion?depth=0')
  if (!current.ok) {
    counts.errores++
    log(`  ! No se pudo leer el global (HTTP ${current.status}).`)
    return { dryRun: false, counts }
  }
  if (hasContent(current.data)) {
    counts.omitidos++
    log('  = Omitido: el global ya tiene contenido (no se modifica).')
    log('')
    log(`Resumen: ${JSON.stringify(counts)}`)
    return { dryRun: false, counts }
  }

  // El arancel se enlaza por la fila existente y publicada; si no está, se siembra sin relación (la página enlazará a los aranceles).
  const q = new URLSearchParams()
  q.set('where[concepto][equals]', ARANCEL_CONCEPTO)
  q.set('where[active][equals]', 'true')
  q.set('limit', '1')
  q.set('depth', '0')
  const arancel = await api('GET', `aranceles-rectorado?${q.toString()}`)
  const arancelId = arancel.ok ? (arancel.data.docs?.[0]?.id ?? null) : null
  if (arancelId == null) log(`  ! No se encontró la fila de arancel «${ARANCEL_CONCEPTO}»: se siembra sin enlazar el arancel (enlácelo desde el panel).`)

  const r = await api('POST', 'globals/titulos-inscripcion', plannedDocument(arancelId))
  if (r.ok) {
    counts.creados++
    log(`  + Contenido sembrado (${TITULOS_SEED.tipos.length} tipos, ${TITULOS_SEED.pasos.length} pasos${arancelId != null ? ', arancel enlazado' : ''}).`)
  } else {
    counts.errores++
    log(`  ! Falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
