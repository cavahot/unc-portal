import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { readBodyLimited, payloadTooLarge } from '@/lib/security/bodyLimit'
import { getClientIp } from '@/lib/security/clientIp'
import { createRateLimiter, tooManyRequests } from '@/lib/security/rateLimit'

// ─── Límite de tasa y tamaño (DEP-06 / RDD-DEP-14) ───────────────────────────
// Qué hace: 5 envíos por minuto por IP confiable (x-real-ip fijado por nginx) y cuerpo ≤ 32 KiB.
// Amenaza: spam por correo; el límite previo tomaba el PRIMER x-forwarded-for, que el
// cliente controla, y se evadía rotándolo. Límite: store en memoria por instancia.
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
const MAX_BODY_BYTES = 32 * 1024

// ─── Sanitize HTML (basic) ───────────────────────────────────────────────────
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Límite por IP confiable (DEP-06): antes de leer el cuerpo o tocar SMTP.
  const rate = limiter.check(getClientIp(req.headers))
  if (!rate.allowed) {
    return tooManyRequests(rate, 'Demasiadas solicitudes. Intentá de nuevo en un minuto.')
  }

  // Cuerpo acotado (DEP-06): 413 si excede el tope por Content-Length o por bytes reales.
  const raw = await readBodyLimited(req, MAX_BODY_BYTES)
  if (!raw.ok) return payloadTooLarge('La solicitud es demasiado grande.')

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw.text)
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const subject = String(body.subject ?? '').trim()
  const message = String(body.message ?? '').trim()

  // Validation
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
  }
  if (name.length > 120 || subject.length > 200 || message.length > 4000) {
    return NextResponse.json({ error: 'Uno o más campos excede la longitud máxima.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'El email no es válido.' }, { status: 400 })
  }

  // Transporte SMTP (DEP-10 / RDD-DEP-33). Qué hace: usa los MISMOS nombres de variable que el CMS
  // (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_ADDRESS). Por qué: antes el
  // portal leía SMTP_PASS/SMTP_FROM y el compose no entregaba ninguno, así que el contacto salía sin
  // credenciales. Límite: `secure` sigue el valor explícito de SMTP_SECURE; si falta, se mantiene el
  // criterio previo (TLS implícito solo en el puerto 465). No valida la conectividad con el relay.
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '1025', 10)
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: smtpPort,
    secure: smtpSecure,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } }
      : {}),
  })

  const from = `"Portal UNC" <${process.env.SMTP_FROM_ADDRESS ?? 'noreply@unc.edu.py'}>`
  const to = process.env.CONTACT_TO ?? 'secgral@unc.edu.py'

  try {
    await transport.sendMail({
      from,
      to,
      replyTo: `"${name}" <${email}>`,
      subject: `[Contacto Web] ${subject}`,
      text: `Nombre: ${name}\nEmail: ${email}\nAsunto: ${subject}\n\n${message}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #d7e0db;">
        <!-- Header -->
        <tr><td style="background:#004700;padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#b8ffb8;">Universidad Nacional de Concepción</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff;">Nuevo mensaje del portal</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 16px 8px 0;color:#6c7b76;font-size:13px;white-space:nowrap;vertical-align:top;width:80px;">Nombre</td>
              <td style="padding:8px 0;font-size:14px;font-weight:600;color:#09231d;">${esc(name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 16px 8px 0;color:#6c7b76;font-size:13px;white-space:nowrap;vertical-align:top;">Email</td>
              <td style="padding:8px 0;font-size:14px;color:#09231d;"><a href="mailto:${esc(email)}" style="color:#008000;">${esc(email)}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 16px 8px 0;color:#6c7b76;font-size:13px;white-space:nowrap;vertical-align:top;">Asunto</td>
              <td style="padding:8px 0;font-size:14px;font-weight:600;color:#09231d;">${esc(subject)}</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #d7e0db;margin:20px 0;" />
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6c7b76;">Mensaje</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#09231d;white-space:pre-wrap;">${esc(message)}</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f4f7f5;border-top:1px solid #d7e0db;">
          <p style="margin:0;font-size:11px;color:#9eac9e;">Enviado desde <a href="https://www.unc.edu.py/contacto" style="color:#008000;">www.unc.edu.py/contacto</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  } catch (err) {
    console.error('[contact] sendMail error', err)
    return NextResponse.json(
      { error: 'No se pudo enviar el mensaje. Intentá más tarde o escribinos directamente a secgral@unc.edu.py.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}
