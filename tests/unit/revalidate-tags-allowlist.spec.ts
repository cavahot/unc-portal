// SEC-REVIEW: toda etiqueta que el CMS envía a /api/revalidate debe estar en la lista permitida del portal.
// Amenaza/riesgo: si un hook del CMS usa una etiqueta que la ruta no acepta (400), la edición se guarda pero el
// portal sigue mostrando contenido viejo sin que nadie lo note (el hook solo registra el fallo). Esta prueba
// DERIVA las etiquetas del código del CMS en vez de repetirlas a mano, así una colección nueva sin su alta en
// ALLOWED_TAGS rompe la suite. Límite: solo ve llamadas literales a `revalidatePortalTag(...)` y las dos formas
// dinámicas conocidas (`ley${...}` y `slug` de transparenciaLey); otra forma dinámica no se detectaría.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'

const revalidateTag = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath }))

const SECRET = 'rv-Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3x'
const CMS_SRC = path.resolve(__dirname, '..', '..', 'apps/cms/src')

/** Lista recursiva de .ts del CMS, sin migraciones ni el propio helper de revalidación. */
function cmsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'migrations' ? [] : cmsFiles(full)
    return e.name.endsWith('.ts') && e.name !== 'revalidation.ts' ? [full] : []
  })
}

/**
 * Extrae las etiquetas de un fuente. Literales -> tal cual; plantillas `prefijo:${...}` -> `prefijo:ejemplo`;
 * `ley${...}` y `revalidatePortalTag(slug` (transparenciaLey) -> las dos leyes. Pura: se prueba con texto falso.
 */
function extractTags(source: string): string[] {
  const tags = new Set<string>()
  for (const m of source.matchAll(/revalidatePortalTag\('([a-z0-9-]+)'/g)) tags.add(m[1])
  for (const m of source.matchAll(/revalidatePortalTag\(`([a-z0-9-]+:)\$\{/g)) tags.add(`${m[1]}ejemplo`)
  if (/revalidatePortalTag\(`ley\$\{/.test(source) || /revalidatePortalTag\(slug\b/.test(source)) {
    tags.add('ley5189')
    tags.add('ley5282')
  }
  return [...tags]
}

describe('extractTags (ayudante)', () => {
  it('detecta literales, plantillas con prefijo y las leyes dinámicas', () => {
    const src = [
      "await revalidatePortalTag('zzz-fake')",
      'await revalidatePortalTag(`pref:${doc.slug}`)',
      'await revalidatePortalTag(`ley${ley}`)',
    ].join('\n')
    expect(extractTags(src).sort()).toEqual(['ley5189', 'ley5282', 'pref:ejemplo', 'zzz-fake'])
  })
})

describe('etiquetas del CMS vs lista permitida de /api/revalidate', () => {
  let POST: (r: NextRequest) => Promise<Response>
  let n = 0
  beforeEach(async () => {
    revalidateTag.mockClear()
    process.env.REVALIDATION_SECRET = SECRET
    vi.resetModules()
    ;({ POST } = (await import('@/app/api/revalidate/route')) as { POST: (r: NextRequest) => Promise<Response> })
  })
  afterEach(() => {
    delete process.env.REVALIDATION_SECRET
  })

  /** Cada llamada usa otra IP para no agotar el limitador (120/min por IP). */
  const post = (tag: string) =>
    POST(
      new NextRequest('http://localhost/api/revalidate', {
        method: 'POST',
        headers: { 'x-real-ip': `203.0.113.${(n++ % 250) + 1}`, authorization: `Bearer ${SECRET}` },
        body: JSON.stringify({ tag }),
      }),
    )

  const derived = [...new Set(cmsFiles(CMS_SRC).flatMap((f) => extractTags(readFileSync(f, 'utf8'))))].sort()

  it('se derivó un conjunto razonable de etiquetas (el barrido no quedó vacío)', () => {
    expect(derived.length).toBeGreaterThan(20)
    expect(derived).toEqual(expect.arrayContaining(['noticias', 'ley5189', 'ley5282', 'transparencia-items', 'paginas-slugs']))
  })

  it('el ayudante de aceptación puede fallar: una etiqueta inventada es rechazada (400)', async () => {
    expect((await post('zzz-fake-tag')).status).toBe(400)
  })

  it.each(derived)('el portal acepta la etiqueta %s', async (tag) => {
    const res = await post(tag)
    expect(res.status, `etiqueta rechazada por la lista permitida: ${tag}`).toBe(200)
  })
})
