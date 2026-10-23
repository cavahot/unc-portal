/**
 * DEP-06: lectura de cuerpo con tope de bytes.
 *
 * Qué hace: lee el cuerpo como texto UTF-8 solo si no supera `maxBytes`.
 * Amenaza que evita: agotar memoria con cuerpos enormes (`request.text()` sin cota).
 * Límite: `Content-Length` es solo una pista (puede faltar con chunked o mentir), por eso
 * además se cuentan los bytes reales del flujo y se corta al exceder. No sustituye
 * `client_max_body_size` de nginx (que hoy permite 20 MB en el portal; DEP-12).
 */
export type BodyReadResult = { ok: true; text: string } | { ok: false }

export async function readBodyLimited(request: Request, maxBytes: number): Promise<BodyReadResult> {
  // 1) Rechazo barato por cabecera, sin tocar el cuerpo. Valor no numérico: se ignora.
  const declared = request.headers.get('content-length')
  if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > maxBytes) {
    return { ok: false }
  }

  if (!request.body) return { ok: true, text: '' }

  // 2) Conteo real del flujo: corta en cuanto se excede el tope.
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return { ok: false }
    }
    chunks.push(value)
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }
  return { ok: true, text: new TextDecoder().decode(merged) }
}

/** Respuesta 413 estándar. */
export function payloadTooLarge(message = 'Payload Too Large'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 413,
    headers: { 'Content-Type': 'application/json' },
  })
}
