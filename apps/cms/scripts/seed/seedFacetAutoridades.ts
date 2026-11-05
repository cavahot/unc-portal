// AUT-FACET: importa autoridades y fotografías desde la fuente oficial FACET-UNC.
// Qué hace: descarga las imágenes, las registra en Media y enlaza cada autoridad con su foto.
// Amenaza: evita hotlinks rotos, duplicados por filename y cargos obsoletos en el portal.
// Límite: no elimina autoridades históricas ni inventa fotos para directivos sin imagen publicada.
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload } from 'payload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })
// AUT-FACET: el seed se ejecuta desde la raíz del monorepo, mientras el CMS dev sirve `apps/cms/media`.
// Qué hace: fija el mismo directorio absoluto que usa el proceso del CMS antes de cargar Payload.
// Amenaza: evita subir el registro a PostgreSQL pero dejar el archivo en otra carpeta y obtener HTTP 500 al servirlo.
// Límite: producción debe definir MEDIA_DIR explícitamente en el volumen persistente; no se adivina aquí.
process.env.MEDIA_DIR ??= path.resolve(__dirname, '../../media')
const { default: config } = await import('../../src/payload.config')
const data = await import(pathToFileURL(path.resolve(__dirname, '../../../../scripts/lib/facetAutoridadesSeedData.mjs')).href)
const payload = await getPayload({ config })

const facultyResult = await payload.find({
  collection: 'facultades',
  where: { slug: { equals: data.FACULTAD_SLUG } },
  limit: 1,
  overrideAccess: true,
})
const faculty = facultyResult.docs[0]
if (!faculty) throw new Error(`No existe la facultad ${data.FACULTAD_SLUG}; ejecute primero el seed de Ciencias Exactas.`)

// AUT-FACET: normaliza los IDs de Media para satisfacer el contrato generado por Payload.
// Qué hace: conserva un ID numérico estable entre filas repetidas del catálogo.
// Amenaza: evita que un string de filename llegue al campo upload y rompa la compilación o el seed.
const mediaCache = new Map<string, number>()
let mediaCreated = 0
let authoritiesCreated = 0
let authoritiesUpdated = 0

async function getOrCreateMedia(photo: { url: string; alt: string }) {
  const filename = new URL(photo.url).pathname.split('/').pop() ?? 'facet-photo.jpg'
  const cached = mediaCache.get(filename)
  if (cached !== undefined) return cached

  const found = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) {
    const mediaId = Number(found.docs[0].id)
    mediaCache.set(filename, mediaId)
    return mediaId
  }

  const response = await fetch(photo.url)
  if (!response.ok) throw new Error(`No se pudo descargar ${photo.url}: HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const sourcePath = new URL(photo.url).pathname.replace(/^\//, '')
  const created = await payload.create({
    collection: 'media',
    data: { alt: photo.alt, sourcePath },
    file: { data: buffer, mimetype: 'image/jpeg', name: filename, size: buffer.length },
    overrideAccess: true,
  })
  const mediaId = Number(created.id)
  mediaCache.set(filename, mediaId)
  mediaCreated += 1
  return mediaId
}

for (const row of data.AUTHORITIES) {
  const photoId = row.photo ? await getOrCreateMedia(row.photo) : undefined
  const authorityResult = await payload.find({ collection: 'autoridades', where: { name: { equals: row.name } }, limit: 1, overrideAccess: true })
  const authorityData: Record<string, unknown> = {
    name: row.name,
    role: row.role,
    type: row.type,
    order: row.order,
    active: true,
    ...(row.faculty ? { faculty: faculty.id } : {}),
    ...(photoId ? { photo: photoId } : {}),
  }

  if (authorityResult.docs[0]) {
    await payload.update({ collection: 'autoridades', id: authorityResult.docs[0].id, data: authorityData, overrideAccess: true })
    authoritiesUpdated += 1
  } else {
    await payload.create({ collection: 'autoridades', data: authorityData, overrideAccess: true, draft: true })
    authoritiesCreated += 1
  }
}

console.log(JSON.stringify({
  source: data.SOURCES.embedded,
  facultyId: faculty.id,
  authorities: data.AUTHORITIES.length,
  authoritiesCreated,
  authoritiesUpdated,
  mediaWithPhoto: data.AUTHORITIES.filter((row: { photo: unknown }) => row.photo).length,
  mediaCreated,
}))
// AUT-FACET: finaliza el proceso tras confirmar las escrituras para no dejar el pool abierto.
// Límite: no elimina registros previos ni desactiva históricos; esa revisión editorial es separada.
process.exit(0)
