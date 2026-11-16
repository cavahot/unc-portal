// AUT-DECANOS: descarga y enlaza únicamente fotos de decanos desde la UNC oficial.
// Qué hace: actualiza la autoridad decano de cada facultad y conserva el resto de autoridades intacto.
// Amenaza: impide tocar rector, vicerrector, directores o representantes durante esta operación.
// Límite: si falta una facultad o un decano, informa el error; no crea facultades ni desactiva históricos.
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload } from 'payload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })
// AUT-DECANOS: alinear el almacenamiento con el proceso CMS para que las imágenes servidas existan físicamente.
// Límite: producción debe definir MEDIA_DIR sobre su volumen persistente.
process.env.MEDIA_DIR ??= path.resolve(__dirname, '../../media')
const { default: config } = await import('../../src/payload.config')
const data = await import(pathToFileURL(path.resolve(__dirname, '../../../../scripts/lib/decanosAutoridadesSeedData.mjs')).href)
const payload = await getPayload({ config })

// AUT-DECANOS: Payload tipa las relaciones de Media como IDs numéricos en este proyecto.
// Qué hace: normaliza el ID devuelto por la consulta antes de construir la autoridad.
// Amenaza: evita enviar rutas/strings como `photo`, lo que bloqueaba la build del CMS.
const mediaCache = new Map<string, number>()
let mediaCreated = 0
let deansUpdated = 0
let deansCreated = 0

async function getOrCreateMedia(image: { url: string; alt: string }) {
  const filename = new URL(image.url).pathname.split('/').pop() ?? 'decanos-unc.jpg'
  const cached = mediaCache.get(filename)
  if (cached !== undefined) return cached
  const existing = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, overrideAccess: true })
  if (existing.docs[0]) {
    const mediaId = Number(existing.docs[0].id)
    mediaCache.set(filename, mediaId)
    return mediaId
  }
  const response = await fetch(image.url)
  if (!response.ok) throw new Error(`No se pudo descargar ${image.url}: HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const created = await payload.create({
    collection: 'media',
    data: { alt: image.alt, sourcePath: new URL(image.url).pathname.replace(/^\//, '') },
    file: { data: buffer, mimetype: 'image/jpeg', name: filename, size: buffer.length },
    overrideAccess: true,
  })
  const mediaId = Number(created.id)
  mediaCache.set(filename, mediaId)
  mediaCreated += 1
  return mediaId
}

for (const row of data.DECANOS) {
  const facultyResult = await payload.find({ collection: 'facultades', where: { slug: { equals: row.facultySlug } }, limit: 1, overrideAccess: true })
  const faculty = facultyResult.docs[0]
  if (!faculty) throw new Error(`No existe la facultad ${row.facultySlug}`)

  const mediaId = await getOrCreateMedia(row.image)
  const authorityResult = await payload.find({
    collection: 'autoridades',
    where: { and: [{ faculty: { equals: faculty.id } }, { type: { equals: 'decano' } }] },
    limit: 1,
    overrideAccess: true,
  })
  const authorityData = {
    name: row.name,
    role: row.role,
    type: row.type,
    faculty: faculty.id,
    photo: mediaId,
    order: row.order,
    active: true,
  }
  if (authorityResult.docs[0]) {
    await payload.update({ collection: 'autoridades', id: authorityResult.docs[0].id, data: authorityData, overrideAccess: true })
    deansUpdated += 1
  } else {
    await payload.create({ collection: 'autoridades', data: authorityData, overrideAccess: true })
    deansCreated += 1
  }
}

console.log(JSON.stringify({ source: data.SOURCE, deans: data.DECANOS.length, deansUpdated, deansCreated, mediaCreated, rectorTouched: false, vicerrectorTouched: false }))
// AUT-DECANOS: cierre explícito para no dejar el pool abierto después de confirmar las escrituras.
process.exit(0)
