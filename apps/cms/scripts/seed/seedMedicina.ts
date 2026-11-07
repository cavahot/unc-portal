// FAC-05: seed idempotente de Medicina mediante Payload Local API.
// Qué hace: crea la facultad/carreras faltantes y completa solo campos vacíos.
// Amenaza: evita duplicados, sobrescritura de ediciones del CMS y procesos CLI que dejan el pool abierto.
// Límite: no carga aranceles porque la fuente oficial no los publica; no ejecuta migraciones ni borrados.
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload } from 'payload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })
const { default: config } = await import('../../src/payload.config')
const data = await import(pathToFileURL(path.resolve(__dirname, '../../../../scripts/lib/medicinaSeedData.mjs')).href)
const payload = await getPayload({ config })

// FAC-05: tipa los campos del catálogo externo antes de recorrerlos dinámicamente.
// Qué hace: conserva el acceso controlado a `value` usado para completar la facultad.
// Amenaza: evita ocultar errores de forma en los datos bajo un `any` global.
type SeedField = { value: unknown }
const facultyFields = data.FACULTAD_FIELDS as Record<string, SeedField>

const existing = await payload.find({ collection: 'facultades', where: { slug: { equals: data.FACULTAD_SLUG } }, limit: 1, overrideAccess: true })
let faculty = existing.docs[0]
if (!faculty) {
  faculty = await payload.create({
    collection: 'facultades',
    data: { nombre: data.FACULTAD_NOMBRE, slug: data.FACULTAD_SLUG, activa: true, ...Object.fromEntries(Object.entries(facultyFields).map(([key, field]) => [key, field.value])) },
    overrideAccess: true,
  })
  console.log('[FAC-05] Facultad creada')
} else {
  const patch: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(facultyFields)) {
    const current = (faculty as unknown as Record<string, unknown>)[key]
    if (current === null || current === undefined || current === '' || (Array.isArray(current) && current.length === 0)) patch[key] = field.value
  }
  if (Object.keys(patch).length > 0) faculty = await payload.update({ collection: 'facultades', id: faculty.id, data: patch, overrideAccess: true })
}

let createdCareers = 0
for (const row of data.CARRERAS) {
  const found = await payload.find({ collection: 'carreras', where: { slug: { equals: row.slug } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) continue
  const { sourceUrl: _sourceUrl, ...career } = row
  await payload.create({ collection: 'carreras', data: { ...career, facultad: faculty.id, activa: true }, overrideAccess: true })
  createdCareers += 1
}

// FAC-05: no se fuerza una autoridad; el CMS ya contiene un decano activo verificado por la consulta previa.
// Límite: si la autoridad cambia, el equipo editorial debe actualizarla desde Autoridades.
console.log(JSON.stringify({ facultyId: faculty.id, careers: data.CARRERAS.length, careersCreated: createdCareers, fees: data.ARANCELES.length, omitted: data.OMITIDOS.length }))
process.exit(0)
