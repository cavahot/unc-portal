import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload } from 'payload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })

const { default: config } = await import('../../src/payload.config')
const data = await import(pathToFileURL(path.resolve(__dirname, '../../../../scripts/lib/humanidadesSeedData.mjs')).href)
const payload = await getPayload({ config })

// FAC-04: declara el contrato mínimo de los campos importados desde el catálogo .mjs.
// Qué hace: permite completar campos vacíos sin perder el chequeo estricto del seed.
// Amenaza: evita que un catálogo mal formado se propague silenciosamente como `any`.
type SeedField = { value: unknown }
const facultyFields = data.FACULTAD_FIELDS as Record<string, SeedField>

const slug = data.FACULTAD_SLUG as string
const existingFaculty = await payload.find({
  collection: 'facultades',
  where: { slug: { equals: slug } },
  limit: 1,
  overrideAccess: true,
})

let faculty = existingFaculty.docs[0]
if (!faculty) {
  faculty = await payload.create({
    collection: 'facultades',
    data: {
      nombre: data.FACULTAD_NOMBRE,
      slug,
      activa: true,
      ...Object.fromEntries(Object.entries(facultyFields).map(([key, field]) => [key, field.value])),
    },
    overrideAccess: true,
  })
  console.log('[FAC-04] Facultad creada')
} else {
  const patch: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(facultyFields)) {
    const current = (faculty as unknown as Record<string, unknown>)[key]
    if (current === null || current === undefined || current === '' || (Array.isArray(current) && current.length === 0)) patch[key] = field.value
  }
  if (Object.keys(patch).length > 0) {
    faculty = await payload.update({ collection: 'facultades', id: faculty.id, data: patch, overrideAccess: true })
    console.log(`[FAC-04] Facultad completada: ${Object.keys(patch).join(', ')}`)
  } else {
    console.log('[FAC-04] Facultad existente; no se pisan ediciones')
  }
}

let createdCareers = 0
for (const row of data.CARRERAS) {
  const found = await payload.find({ collection: 'carreras', where: { slug: { equals: row.slug } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) continue
  const { sourceUrl: _sourceUrl, ...career } = row
  await payload.create({ collection: 'carreras', data: { ...career, facultad: faculty.id, activa: true }, overrideAccess: true })
  createdCareers += 1
}

let createdFees = 0
for (const row of data.ARANCELES) {
  const found = await payload.find({
    collection: 'aranceles-facultad',
    where: { and: [{ facultad: { equals: faculty.id } }, { grupo: { equals: row.grupo } }, { concepto: { equals: row.concepto } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs[0]) continue
  const { sourceUrl: _sourceUrl, ...fee } = row
  await payload.create({ collection: 'aranceles-facultad', data: { ...fee, facultad: faculty.id, active: true }, overrideAccess: true })
  createdFees += 1
}

console.log(JSON.stringify({ facultyId: faculty.id, careers: data.CARRERAS.length, careersCreated: createdCareers, fees: data.ARANCELES.length, feesCreated: createdFees }))
// FAC-04: el seed es un proceso CLI de una sola ejecución; termina explícitamente para no dejar el pool abierto.
// Límite: Payload ya confirmó cada escritura antes de este punto; no se fuerzan migraciones ni borrados.
process.exit(0)
