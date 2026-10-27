// PRA-01 (fase CMS): el endpoint de revalidación del portal debe aceptar las etiquetas nuevas.
// Amenaza: sin la etiqueta en ALLOWED_TAGS el CMS no puede refrescar el portal tras editar (400), y una
// lista abierta de prefijos permitiría invalidar caché arbitraria. Límite: se ejecuta con next/cache simulado.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const revalidateTag = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath }))

const SECRET = 'rv-Qx2mVb7LpZr4TnW8sYc1HdJf6GuEa3x'

describe('PRA-01: etiquetas de revalidación', () => {
  beforeEach(() => {
    revalidateTag.mockClear()
    process.env.REVALIDATION_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.REVALIDATION_SECRET
  })

  const post = async (tag: string) => {
    vi.resetModules()
    const { POST } = (await import('@/app/api/revalidate/route')) as { POST: (r: NextRequest) => Promise<Response> }
    return POST(
      new NextRequest('http://localhost/api/revalidate', {
        method: 'POST',
        headers: { 'x-real-ip': '203.0.113.20', authorization: `Bearer ${SECRET}` },
        body: JSON.stringify({ tag }),
      }),
    )
  }

  // LT-01: `linea-tiempo` la envía el CMS al guardar/borrar un hito de /historia.
  it.each(['reconocimientos', 'acreditaciones', 'linea-tiempo'])('acepta %s', async (tag) => {
    expect((await post(tag)).status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith(tag, {})
  })

  it.each(['acreditaciones:x', 'reconocimientos:1', 'acreditacion', 'linea-tiempo:1'])('rechaza %s (sin prefijos libres)', async (tag) => {
    expect((await post(tag)).status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
