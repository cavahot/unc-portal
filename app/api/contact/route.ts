import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Resets on each cold start. For multi-instance deploys, use Redis instead.
const rl = new Map<string, { n: number; reset: number }>()
const LIMIT = 5
const WINDOW = 60_000 // 1 minute

function allow(ip: string): boolean {
  const now = Date.now()
  const e = rl.get(ip)
  if (!e || now > e.reset) { rl.set(ip, { n: 1, reset: now + WINDOW }); return true }
  if (e.n >= LIMIT) return false
  e.n++
  return true
}

// ─── Sanitize HTML (basic) ───────────────────────────────────────────────────
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (!allow(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' },
      { status: 429 },
    )
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
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

  // Transport
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '1025', 10)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: smtpPort,
    secure: smtpPort === 465,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } }
      : {}),
  })

  const from = `"Portal UNC" <${process.env.SMTP_FROM ?? 'noreply@unc.edu.py'}>`
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
          <p style="margin:0;font-size:11px;color:#9eac9e;">Enviado desde <a href="https://portal.unc.edu.py/contacto" style="color:#008000;">portal.unc.edu.py/contacto</a></p>
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
