import { getPayload } from 'payload'
import config from '../payload.config'
import type { Payload } from 'payload'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? 'http://localhost:3002'
const PORTAL_URL = process.env.PORTAL_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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

const emailTemplates: Record<NotificationType, (data: NotificationData) => { subject: string; html: string }> = {
  noticia_creada: (data) => ({
    subject: `[UNC Portal] Nueva noticia en borrador: ${data.noticiaTitulo}`,
    html: `
      <h2>Nueva Noticia Creada</h2>
      <p><strong>Título:</strong> ${data.noticiaTitulo}</p>
      <p><strong>Creado por:</strong> ${data.usuarioNombre || data.usuarioEmail}</p>
      <p><strong>Estado:</strong> Borrador</p>
      <hr>
      <p>La noticia está lista para ser enviada a revisión.</p>
      <p><a href="${CMS_URL}/accesoSeguro/collections/noticias/${data.noticiaId}">Ver en CMS →</a></p>
    `,
  }),

  envio_revision: (data) => ({
    subject: `[UNC Portal] Noticia en revisión: ${data.noticiaTitulo}`,
    html: `
      <h2>Noticia Enviada a Revisión</h2>
      <p><strong>Título:</strong> ${data.noticiaTitulo}</p>
      <p><strong>Enviado por:</strong> ${data.usuarioNombre || data.usuarioEmail}</p>
      <p><strong>Estado:</strong> En Revisión</p>
      <hr>
      <p>Hola ${data.revisorEmail},</p>
      <p>Una noticia ha sido enviada para tu revisión. Por favor, revísala y aprueba o rechaza según sea necesario.</p>
      <p><a href="${CMS_URL}/accesoSeguro/collections/noticias/${data.noticiaId}">Revisar noticia →</a></p>
    `,
  }),

  noticia_aprobada: (data) => ({
    subject: `[UNC Portal] Noticia aprobada: ${data.noticiaTitulo}`,
    html: `
      <h2>Noticia Aprobada</h2>
      <p><strong>Título:</strong> ${data.noticiaTitulo}</p>
      <p><strong>Estado:</strong> Aprobada</p>
      <hr>
      <p>Tu noticia ha sido aprobada y está lista para publicación.</p>
      <p><a href="${CMS_URL}/accesoSeguro/collections/noticias/${data.noticiaId}">Ver en CMS →</a></p>
    `,
  }),

  noticia_rechazada: (data) => ({
    subject: `[UNC Portal] Noticia rechazada: ${data.noticiaTitulo}`,
    html: `
      <h2>Noticia Rechazada</h2>
      <p><strong>Título:</strong> ${data.noticiaTitulo}</p>
      <p><strong>Estado:</strong> Rechazada</p>
      <hr>
      <p>Tu noticia ha sido rechazada con el siguiente comentario:</p>
      <blockquote style="border-left: 3px solid #ccc; padding: 10px; margin: 10px 0;">
        ${data.comentario || 'Sin comentarios'}
      </blockquote>
      <p>Por favor, revisa y vuelve a enviar cuando esté lista.</p>
      <p><a href="${CMS_URL}/accesoSeguro/collections/noticias/${data.noticiaId}">Editar noticia →</a></p>
    `,
  }),

  noticia_publicada: (data) => ({
    subject: `[UNC Portal] Noticia publicada: ${data.noticiaTitulo}`,
    html: `
      <h2>Noticia Publicada</h2>
      <p><strong>Título:</strong> ${data.noticiaTitulo}</p>
      <p><strong>Estado:</strong> Publicada</p>
      <hr>
      <p>¡Felicidades! Tu noticia ha sido publicada en el portal.</p>
      <p><a href="${PORTAL_URL}/noticias/${data.noticiaSlug}">Ver en portal →</a></p>
    `,
  }),
}

export async function sendNotification(data: NotificationData, payloadInstance?: Payload): Promise<void> {
  try {
    const payload = payloadInstance ?? await getPayload({ config })
    const template = emailTemplates[data.type]

    if (!template) {
      console.error(`Unknown notification type: ${data.type}`)
      return
    }

    const { subject, html } = template(data)

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
