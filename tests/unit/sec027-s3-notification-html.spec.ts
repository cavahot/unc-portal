// SEC-027 S-3 (diagnóstico previo al deploy, 2026-11-12): inyección de HTML en los correos de notificación editorial.
// Qué comprueba: título, nombre, correo y comentario se escapan; el asunto no admite saltos de línea; los enlaces se
// arman con `new URL` y el slug y el id van codificados. Amenaza: un editor o corresponsal ponía HTML (un enlace de
// phishing) en el título, y el correo lo recibían revisores y publicadores desde el dominio institucional.
// Límite: prueba la plantilla; el envío real lo hace Payload con nodemailer.
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))

import { renderNotificationEmail, type NotificationData, type NotificationType } from '../../apps/cms/src/utilities/notifications'

const ataque = '<a href="https://phishing.example/login">Ingrese aquí</a><script>alert(1)</script>'
const base: NotificationData = {
  type: 'noticia_creada',
  noticiaId: 12,
  noticiaTitulo: ataque,
  noticiaSlug: 'nota"><img src=x onerror=alert(1)>',
  usuarioEmail: 'autor@unc.edu.py',
  usuarioNombre: '<b>Autor</b>',
  revisorEmail: 'revisor@unc.edu.py"><i>x</i>',
  comentario: '<a href="https://phishing.example">Corrija aquí</a>',
}
const tipos: NotificationType[] = ['noticia_creada', 'envio_revision', 'noticia_aprobada', 'noticia_rechazada', 'noticia_publicada']

describe('S-3: plantillas de correo sin HTML inyectado', () => {
  it.each(tipos)('%s: no aparece ninguna etiqueta del usuario sin escapar', (type) => {
    const { html } = renderNotificationEmail({ ...base, type })
    expect(html).not.toContain('phishing.example/login">')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>Autor')
    expect(html).not.toContain('<i>x</i>')
    expect(html).toContain('&lt;a href=&quot;https://phishing.example/login&quot;&gt;')
  })

  it('el comentario de rechazo también se escapa', () => {
    const { html } = renderNotificationEmail({ ...base, type: 'noticia_rechazada' })
    expect(html).not.toContain('<a href="https://phishing.example">')
    expect(html).toContain('&lt;a href=&quot;https://phishing.example&quot;&gt;')
  })

  it('el asunto no admite saltos de línea (inyección de cabeceras)', () => {
    const { subject } = renderNotificationEmail({ ...base, type: 'noticia_creada', noticiaTitulo: 'Hola\r\nBcc: todos@example.invalid' })
    expect(subject).not.toMatch(/[\r\n]/)
  })

  it('los enlaces apuntan al CMS o al portal con el id y el slug codificados', () => {
    const { html } = renderNotificationEmail({ ...base, type: 'noticia_publicada' })
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1])
    expect(hrefs).toHaveLength(1)
    const url = new URL(hrefs[0].replace(/&amp;/g, '&'))
    expect(url.pathname).toBe(`/noticias/${encodeURIComponent(base.noticiaSlug)}`)
    const cms = renderNotificationEmail({ ...base, type: 'noticia_aprobada' }).html
    expect(cms).toMatch(/href="http[^"]+\/accesoSeguro\/collections\/noticias\/12"/)
  })
})

// Aviso 4 del verificador: una URL de entorno vacía o sin esquema no debe impedir el correo (antes se enviaba con un
// enlace roto; `new URL` lanzaría y no saldría ningún correo), y la ruta base de PORTAL_URL se conserva.
describe('S-3: URLs de entorno', () => {
  const load = async (env: Record<string, string>) => {
    vi.resetModules()
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
    return import('../../apps/cms/src/utilities/notifications')
  }

  it('con PORTAL_URL o NEXT_PUBLIC_SERVER_URL vacías no lanza y arma el correo', async () => {
    const mod = await load({ PORTAL_URL: '', NEXT_PUBLIC_SERVER_URL: '' })
    for (const type of tipos) expect(() => mod.renderNotificationEmail({ ...base, type }), type).not.toThrow()
    vi.unstubAllEnvs()
  })

  it('con una URL sin esquema no lanza y no pone un enlace inválido', async () => {
    const mod = await load({ PORTAL_URL: 'portal-sin-esquema' })
    const out = mod.renderNotificationEmail({ ...base, type: 'noticia_publicada' })
    expect(out?.html).not.toContain('href="portal-sin-esquema')
    vi.unstubAllEnvs()
  })

  it('conserva la ruta base de PORTAL_URL', async () => {
    const mod = await load({ PORTAL_URL: 'https://www.unc.edu.py/inicio/' })
    const out = mod.renderNotificationEmail({ ...base, type: 'noticia_publicada', noticiaSlug: 'mi-nota' })
    expect(out?.html).toContain('href="https://www.unc.edu.py/inicio/noticias/mi-nota"')
    vi.unstubAllEnvs()
  })
})
