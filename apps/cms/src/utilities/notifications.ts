import { getPayload } from 'payload'
import config from '../payload.config'
import type { Payload } from 'payload'

// DEP-10: nombres canónicos dentro del CMS. NEXT_PUBLIC_SERVER_URL = URL pública del CMS (convención de
// Payload); PORTAL_URL = URL pública del portal. NEXT_PUBLIC_CMS_URL (origen público de /api/media/file/**, www) y
// NEXT_PUBLIC_SITE_URL son del portal.
// SEC-027 S-3: `||` y no `??`: el compose pasa una cadena vacía cuando la variable de origen no está definida.
const CMS_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3002'
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3000'

export type NotificationType =
  | 'noticia_creada'
  | 'envio_revision'
  | 'noticia_aprobada'
  | 'noticia_rechazada'
  | 'noticia_publicada'

export interface NotificationData {
  type: NotificationType
  noticiaId: number
  noticiaTitulo: string
  noticiaSlug: string
  usuarioEmail: string
  usuarioNombre?: string
  revisorEmail?: string
  revisorTelefono?: string
  revisorTelegramId?: string
  comentario?: string
}

async function getEditorialEmails(payloadInstance?: Payload): Promise<string[]> {
  try {
    const payload = payloadInstance ?? await getPayload({ config })
    const usuarios = await payload.find({
      collection: 'users',
      where: {
        role: {
          in: ['web-admin', 'publisher', 'reviewer'],
        },
      },
      limit: 100,
    })

    return usuarios.docs.map((u: any) => u.email).filter(Boolean)
  } catch (error) {
    console.error('Error fetching editorial emails:', error)
    return []
  }
}

export async function notifyN8N(data: NotificationData): Promise<void> {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nWebhookUrl) {
      console.warn('[N8N] N8N_WEBHOOK_URL not configured — skipping webhook notification')
      return
    }

    const webhookPayload = {
      noticiaId: data.noticiaId,
      noticiaTitulo: data.noticiaTitulo,
      noticiaSlug: data.noticiaSlug,
      usuarioEmail: data.usuarioEmail,
      usuarioNombre: data.usuarioNombre,
      revisorEmail: data.revisorEmail,
      type: data.type,
    }

    console.log(`[N8N] Enviando notificación: ${data.type} / noticia ${data.noticiaId}`)

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...webhookPayload,
        revisorTelefono: data.revisorTelefono,
        revisorTelegramId: data.revisorTelegramId,
      }),
    })

    console.log(`N8N response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      console.error(`N8N error: ${response.status} ${response.statusText}`)
      return
    }

    console.log(`✓ N8N notified for ${data.type}`)
  } catch (error) {
    console.error('Error notifying N8N:', error)
  }
}

/**
 * SEC-027 S-3: escapa un texto para insertarlo en el HTML del correo. Amenaza que evita: que un editor o corresponsal
 * ponga HTML (un enlace de phishing, una imagen de rastreo) en el título o el comentario y que revisores y publicadores
 * lo reciban desde el dominio institucional. Límite: solo para contenido de texto y valores de atributos entre comillas.
 */
export function escapeHtml(value: unknown): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(value ?? '').replace(/[&<>"']/g, (c) => map[c])
}

/** SEC-027 S-3: el asunto es una cabecera: sin saltos de línea (inyección de cabeceras como `Bcc:`). */
const oneLine = (value: unknown) => String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim()

/** SEC-027 S-3: enlaces armados con `new URL` y el id/slug codificados; no se pueden cerrar el atributo ni cambiar de host. */
// La base se une como texto (conserva una ruta base como `https://www.unc.edu.py/inicio`) y `new URL` solo valida el
// resultado: el tramo propio va codificado, así que no puede cambiar el host. Una base vacía o sin esquema http(s) no
// tumba el correo: devuelve '' y la plantilla omite el enlace (antes, `new URL` lanzaba y no salía ningún correo).
const joinUrl = (base: string, path: string): string => {
  try {
    const url = new URL(`${base.replace(/\/+$/, '')}${path}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? escapeHtml(url.toString()) : ''
  } catch {
    return ''
  }
}
const cmsNoticiaUrl = (id: number) => joinUrl(CMS_URL, `/accesoSeguro/collections/noticias/${encodeURIComponent(String(id))}`)
const portalNoticiaUrl = (slug: string) => joinUrl(PORTAL_URL, `/noticias/${encodeURIComponent(String(slug ?? ''))}`)

/** Enlace de la plantilla, o nada si la URL de entorno no es válida (el correo sale igual, sin el enlace). */
const link = (href: string, text: string) => (href ? `<p><a href="${href}">${text}</a></p>` : '')

/** Valores ya escapados que usan las plantillas: ninguna plantilla toca `NotificationData` directamente. */
type SafeNotification = {
  titulo: string
  autor: string
  revisor: string
  comentario: string
  cmsUrl: string
  portalUrl: string
}

const emailTemplates: Record<NotificationType, (d: SafeNotification) => string> = {
  noticia_creada: (d) => `
      <h2>Nueva Noticia Creada</h2>
      <p><strong>Título:</strong> ${d.titulo}</p>
      <p><strong>Creado por:</strong> ${d.autor}</p>
      <p><strong>Estado:</strong> Borrador</p>
      <hr>
      <p>La noticia está lista para ser enviada a revisión.</p>
      ${link(d.cmsUrl, 'Ver en CMS →')}
    `,

  envio_revision: (d) => `
      <h2>Noticia Enviada a Revisión</h2>
      <p><strong>Título:</strong> ${d.titulo}</p>
      <p><strong>Enviado por:</strong> ${d.autor}</p>
      <p><strong>Estado:</strong> En Revisión</p>
      <hr>
      <p>Hola ${d.revisor},</p>
      <p>Una noticia ha sido enviada para tu revisión. Por favor, revísala y aprueba o rechaza según sea necesario.</p>
      ${link(d.cmsUrl, 'Revisar noticia →')}
    `,

  noticia_aprobada: (d) => `
      <h2>Noticia Aprobada</h2>
      <p><strong>Título:</strong> ${d.titulo}</p>
      <p><strong>Estado:</strong> Aprobada</p>
      <hr>
      <p>Tu noticia ha sido aprobada y está lista para publicación.</p>
      ${link(d.cmsUrl, 'Ver en CMS →')}
    `,

  noticia_rechazada: (d) => `
      <h2>Noticia Rechazada</h2>
      <p><strong>Título:</strong> ${d.titulo}</p>
      <p><strong>Estado:</strong> Rechazada</p>
      <hr>
      <p>Tu noticia ha sido rechazada con el siguiente comentario:</p>
      <blockquote style="border-left: 3px solid #ccc; padding: 10px; margin: 10px 0;">
        ${d.comentario}
      </blockquote>
      <p>Por favor, revisa y vuelve a enviar cuando esté lista.</p>
      ${link(d.cmsUrl, 'Editar noticia →')}
    `,

  noticia_publicada: (d) => `
      <h2>Noticia Publicada</h2>
      <p><strong>Título:</strong> ${d.titulo}</p>
      <p><strong>Estado:</strong> Publicada</p>
      <hr>
      <p>¡Felicidades! Tu noticia ha sido publicada en el portal.</p>
      ${link(d.portalUrl, 'Ver en portal →')}
    `,
}

const SUBJECTS: Record<NotificationType, string> = {
  noticia_creada: 'Nueva noticia en borrador',
  envio_revision: 'Noticia en revisión',
  noticia_aprobada: 'Noticia aprobada',
  noticia_rechazada: 'Noticia rechazada',
  noticia_publicada: 'Noticia publicada',
}

/**
 * SEC-027 S-3: asunto y HTML del correo de una notificación. Todo dato que viene del contenido o de la cuenta se escapa
 * aquí, en un solo lugar, antes de llegar a la plantilla. Devuelve `null` para un tipo desconocido.
 */
export function renderNotificationEmail(data: NotificationData): { subject: string; html: string } | null {
  const template = emailTemplates[data.type]
  if (!template) return null
  const html = template({
    titulo: escapeHtml(data.noticiaTitulo),
    autor: escapeHtml(data.usuarioNombre || data.usuarioEmail),
    revisor: escapeHtml(data.revisorEmail),
    comentario: escapeHtml(data.comentario || 'Sin comentarios'),
    cmsUrl: cmsNoticiaUrl(data.noticiaId),
    portalUrl: portalNoticiaUrl(data.noticiaSlug),
  })
  return { subject: `[UNC Portal] ${SUBJECTS[data.type]}: ${oneLine(data.noticiaTitulo)}`, html }
}

export async function sendNotification(data: NotificationData, payloadInstance?: Payload): Promise<void> {
  try {
    const payload = payloadInstance ?? await getPayload({ config })
    const rendered = renderNotificationEmail(data)

    if (!rendered) {
      console.error(`Unknown notification type: ${data.type}`)
      return
    }

    const { subject, html } = rendered

    // Determinar destinatarios
    let recipients: string[] = []
    switch (data.type) {
      case 'noticia_creada':
        // Notificar a editores
        recipients = await getEditorialEmails(payload)
        break
      case 'envio_revision':
        // Notificar al revisor específico
        recipients = data.revisorEmail ? [data.revisorEmail] : await getEditorialEmails(payload)
        break
      case 'noticia_aprobada':
      case 'noticia_rechazada':
      case 'noticia_publicada':
        // Notificar al autor
        recipients = [data.usuarioEmail]
        break
    }

    // Enviar emails
    for (const email of recipients) {
      try {
        await payload.sendEmail({
          to: email,
          subject,
          html,
        })
        console.log(`[Mail] Email enviado para ${data.type}`)
      } catch (error) {
        console.error(`Error sending email for ${data.type}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in sendNotification:', error)
  }
}

export async function notifyApprovalStateChange(
  noticiaId: number,
  noticiaTitulo: string,
  noticiaSlug: string,
  previousStatus: string,
  newStatus: string,
  usuarioEmail: string,
  usuarioNombre?: string,
  revisorEmail?: string,
  comentario?: string
): Promise<void> {
  let notificationType: NotificationType | null = null

  if (previousStatus === 'draft' && newStatus === 'en_revision') {
    notificationType = 'envio_revision'
  } else if (newStatus === 'aprobado') {
    notificationType = 'noticia_aprobada'
  } else if (newStatus === 'rechazado') {
    notificationType = 'noticia_rechazada'
  } else if (newStatus === 'publicado') {
    notificationType = 'noticia_publicada'
  }

  if (notificationType) {
    await sendNotification({
      type: notificationType,
      noticiaId,
      noticiaTitulo,
      noticiaSlug,
      usuarioEmail,
      usuarioNombre,
      revisorEmail,
      comentario,
    })
  }
}
