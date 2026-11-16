// FAC-07: seed idempotente de Ciencias Económicas mediante Payload Local API.
// Qué hace: completa la facultad, crea carreras/aranceles faltantes y reutiliza el decano existente.
// Amenaza: evita duplicados y no pisa ediciones editoriales ya guardadas en el CMS.
// Límite: no actualiza autoridades ni rectorado; el decano se mantiene bajo control editorial.
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload } from 'payload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })
const { default: config } = await import('../../src/payload.config')
const data = await import(pathToFileURL(path.resolve(__dirname, '../../../../scripts/lib/cienciasEconomicasSeedData.mjs')).href)
const payload = await getPayload({ config })

// FAC-07: los datos .mjs llegan como unknown bajo TypeScript estricto.
// Qué hace: declara únicamente la forma mínima que el seed necesita para leer `value`.
// Amenaza: evita relajar todo el script a `any` y ocultar errores en los datos editoriales.
type SeedField = { value: unknown }
const facultyFields = data.FACULTAD_FIELDS as Record<string, SeedField>

const existingFaculty = await payload.find({ collection: 'facultades', where: { slug: { equals: data.FACULTAD_SLUG } }, limit: 1, overrideAccess: true })
let faculty = existingFaculty.docs[0]
if (!faculty) {
  faculty = await payload.create({ collection: 'facultades', data: { nombre: data.FACULTAD_NOMBRE, slug: data.FACULTAD_SLUG, activa: true, ...Object.fromEntries(Object.entries(facultyFields).map(([key, field]) => [key, field.value])) }, overrideAccess: true })
} else {
  const patch: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(facultyFields)) {
    const current = (faculty as unknown as Record<string, unknown>)[key]
    if (current === null || current === undefined || current === '' || (Array.isArray(current) && current.length === 0)) patch[key] = field.value
  }
  if (Object.keys(patch).length > 0) faculty = await payload.update({ collection: 'facultades', id: faculty.id, data: patch, overrideAccess: true })
}

let careersCreated = 0
for (const row of data.CARRERAS) {
  const found = await payload.find({ collection: 'carreras', where: { slug: { equals: row.slug } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) {
    // FAC-07: completa resoluciones CONES ausentes sin pisar otros campos editoriales.
    // Amenaza: evita que una carrera ya publicada conserve una ficha de habilitación incompleta.
    // Límite: solo agrega números CONES que no existan; no elimina ni reemplaza resoluciones editoriales.
    // FAC-07: la interfaz generada no tiene índice dinámico; el cast intermedio conserva el acceso acotado.
    const current = found.docs[0] as unknown as Record<string, unknown>
    const existingResolutions = Array.isArray(current.resoluciones) ? current.resoluciones as Array<{ numero?: string; detalle?: string }> : []
    const missingResolutions = row.resoluciones.filter((resolution: { numero: string }) => !existingResolutions.some((existing) => existing.numero === resolution.numero))
    if (missingResolutions.length > 0) {
      await payload.update({ collection: 'carreras', id: found.docs[0].id, data: { resoluciones: [...existingResolutions, ...missingResolutions] }, overrideAccess: true })
    }
    continue
  }
  const { sourceUrl: _sourceUrl, ...career } = row
  await payload.create({ collection: 'carreras', data: { ...career, facultad: faculty.id }, overrideAccess: true })
  careersCreated += 1
}

let feesCreated = 0
for (const row of data.ARANCELES) {
  const found = await payload.find({ collection: 'aranceles-facultad', where: { and: [{ facultad: { equals: faculty.id } }, { grupo: { equals: row.grupo } }, { concepto: { equals: row.concepto } }] }, limit: 1, overrideAccess: true })
  if (found.docs[0]) continue
  const { sourceUrl: _sourceUrl, ...fee } = row
  await payload.create({ collection: 'aranceles-facultad', data: { ...fee, facultad: faculty.id }, overrideAccess: true })
  feesCreated += 1
}

console.log(JSON.stringify({ source: data.SOURCES.UNC, facultyId: faculty.id, careers: data.CARRERAS.length, careersCreated, fees: data.ARANCELES.length, feesCreated, authoritiesTouched: false }))
process.exit(0)
