/**
 * probe-minimizacion.ts — SEC-027, comprobación de la minimización de datos del autor contra la base LOCAL
 * (spec: docs/security/SEC-027-MATRIZ-ROLES.md, observación sobre P10; pruebas: tests/unit/sec027-minimizacion-autor.spec.ts).
 *
 * Qué hace: crea un autor sintético (`sonda-minimizacion@example.invalid`, rol editor, teléfono ficticio, contraseña
 *   aleatoria en memoria), crea con él una noticia en borrador y la edita; lee la noticia con depth 1 sin filtro de acceso
 *   (lo que vería un superadmin) y la última fila de auditoría de esa edición; informa qué claves del autor viajaron y si la
 *   auditoría guardó correo o teléfono; SIEMPRE borra la noticia y la cuenta.
 * Por qué existe: la sonda P10 de probe-roles.ts no lo cubre (las noticias locales no tienen autor y no prueba superadmin).
 * Amenazas que evita: tocar una base remota (solo DATABASE_URL local), dejar la cuenta sintética (limpieza en `finally`),
 *   imprimir credenciales (no se imprimen). Límite: las filas de auditoría de la sonda quedan (la auditoría no se borra) y
 *   solo contienen el correo sintético en `usuario`.
 *
 * Uso (desde la raíz del repo): npx tsx apps/cms/scripts/security/probe-minimizacion.ts --apply
 */
import { config as loadEnv } from 'dotenv'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload, type Payload } from 'payload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })

const EMAIL = 'sonda-minimizacion@example.invalid'
const PHONE = '+595000000000'

/** Solo bases locales: la sonda crea y borra datos. */
function assertLocalDatabase(): void {
  // Misma variable que usa el CMS (config/database.ts → getDatabaseURL).
  const raw = process.env.DATABASE_URI?.trim() || ''
  const host = raw ? new URL(raw).hostname : ''
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error('Esta sonda solo corre contra una base local (DATABASE_URL con host localhost).')
  }
}

const paragraph = (text: string) => ({
  root: {
    type: 'root', version: 1, direction: null, format: '', indent: 0,
    children: [{ type: 'paragraph', version: 1, direction: null, format: '', indent: 0, textFormat: 0,
      children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }] }],
  },
})

/** Borra la noticia y la cuenta de la sonda, aunque haya quedado de una corrida cortada. */
async function cleanup(payload: Payload): Promise<void> {
  const users = await payload.find({ collection: 'users', where: { email: { equals: EMAIL } }, depth: 0, overrideAccess: true })
  for (const u of users.docs) {
    await payload.delete({ collection: 'noticias', where: { createdBy: { equals: u.id } }, overrideAccess: true })
    await payload.delete({ collection: 'users', id: u.id, overrideAccess: true })
  }
}

async function main(): Promise<void> {
  if (!process.argv.includes('--apply')) {
    console.log('Plan: crear autor sintético + noticia en borrador, editarla, leer createdBy (depth 1) y la auditoría, borrar. Use --apply.')
    return
  }
  assertLocalDatabase()
  const configModule = await import('../../src/payload.config.js')
  const payload = await getPayload({ config: configModule.default })
  let ok = true
  try {
    await cleanup(payload)
    // SEC-CUENTAS-01: contraseña que cumple la política (sufijo fijo con las clases de caracteres) y cuenta sin cambio
    // obligatorio (`exigirCambio: false`, respetado por el hook `enforcePasswordLifecycle`; la fecha la fija el hook).
    // Por qué: esta sonda mide la minimización de datos del autor, no el bloqueo por cambio pendiente; con el cambio
    // pendiente el autor no tendría rol y los hooks editoriales verían otra cosa.
    const user = await payload.create({
      collection: 'users',
      data: {
        email: EMAIL,
        password: `${randomBytes(18).toString('base64url')}Kq#Wz482`,
        role: 'editor',
        telefono: PHONE,
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
      context: { exigirCambio: false },
    })
    const slug = `sonda-minimizacion-${randomBytes(4).toString('hex')}`
    const created = await payload.create({
      collection: 'noticias',
      data: { title: 'Sonda de minimización', slug, summary: 'Sonda SEC-027', content: paragraph('Sonda') } as never,
      user,
      overrideAccess: true,
      draft: true,
    })
    await payload.update({
      collection: 'noticias', id: created.id, data: { title: 'Sonda de minimización (editada)' } as never,
      user, overrideAccess: true, draft: true,
    })

    const read = await payload.findByID({ collection: 'noticias', id: created.id, depth: 1, overrideAccess: true, draft: true })
    const cb = (read as { createdBy?: unknown }).createdBy
    const keys = cb && typeof cb === 'object' ? Object.keys(cb).sort() : []
    // `collection` es la marca de Payload para documentos de colecciones con autenticación, no un dato personal.
    const leaked = keys.filter((k) => !['id', 'email', 'role', 'collection'].includes(k))
    console.log(`S1 createdBy con depth 1 (vista superadmin): claves = [${keys.join(', ')}] → ${leaked.length === 0 && keys.length > 0 ? 'OK' : 'FALLA'}`)
    if (leaked.length > 0 || keys.length === 0) ok = false

    const audit = await payload.find({
      collection: 'auditoria', where: { documento: { contains: `(ID: ${created.id})` } },
      sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true,
    })
    const cambios = JSON.stringify(audit.docs[0]?.cambiosRelevantes ?? null)
    const auditLeak = cambios.includes(EMAIL) || cambios.includes(PHONE) || /telefono|sessions/.test(cambios)
    console.log(`S2 auditoría de la edición: campos = [${Object.keys(audit.docs[0]?.cambiosRelevantes ?? {}).join(', ')}], correo/teléfono/sesiones del autor: ${auditLeak ? 'PRESENTES → FALLA' : 'ausentes → OK'}`)
    if (!audit.docs[0] || auditLeak) ok = false
    // Diagnóstico sin valores: forma (claves) de cada campo guardado, para ubicar de dónde viene un dato filtrado.
    const shape = (v: unknown) => (v && typeof v === 'object' ? `{${Object.keys(v).sort().join(',')}}` : typeof v)
    for (const [campo, par] of Object.entries((audit.docs[0]?.cambiosRelevantes ?? {}) as Record<string, { antes?: unknown; despues?: unknown }>)) {
      console.log(`   ${campo}: antes=${shape(par?.antes)} despues=${shape(par?.despues)}`)
    }
  } finally {
    await cleanup(payload)
    const rest = await payload.count({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true })
    console.log(`Limpieza: cuentas de la sonda restantes = ${rest.totalDocs}`)
  }
  console.log(ok ? 'Resultado: OK' : 'Resultado: FALLA')
  process.exit(ok ? 0 : 1)
}

main().catch((error) => {
  console.error('Sonda interrumpida:', error instanceof Error ? error.message : 'error desconocido')
  process.exit(1)
})
