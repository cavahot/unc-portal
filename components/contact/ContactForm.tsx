'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface Fields {
  name: string
  email: string
  subject: string
  message: string
}

const EMPTY: Fields = { name: '', email: '', subject: '', message: '' }

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const inputClass =
  'w-full rounded-xl border border-[#D7E0DB] bg-white px-4 py-3 text-sm text-[#09231D] placeholder:text-[#9EAC9E] transition-colors focus:border-[#37D448] focus:outline-none focus:ring-2 focus:ring-[#5CFF5C]/30 disabled:opacity-50'

const labelClass = 'mb-1.5 block text-sm font-semibold text-[#09231D]'

export default function ContactForm() {
  const t = useTranslations('pages.contacto')
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const busy = status === 'loading'

  function set(k: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error desconocido.')
        setStatus('error')
        return
      }

      setStatus('success')
      setFields(EMPTY)
    } catch {
      setErrorMsg('No se pudo conectar. Verificá tu conexión e intentá de nuevo.')
      setStatus('error')
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#37D448]/30 bg-[#E6FFE6] px-8 py-14 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#004700] text-white shadow-[0_8px_24px_rgba(0,71,0,0.3)]">
          <IconCheck />
        </div>
        <h3 className="text-xl font-bold text-[#004700]">¡Mensaje enviado!</h3>
        <p className="mt-2 max-w-xs text-sm leading-6 text-[#3a6040]">
          Recibimos tu consulta y te responderemos a <span className="font-semibold">{fields.email || 'tu email'}</span> a la brevedad.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-8 rounded-full border border-[#004700]/30 px-5 py-2 text-sm font-semibold text-[#004700] transition-colors hover:bg-[#004700]/5"
        >
          Enviar otro mensaje
        </button>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            {t('form.fields.name')}
          </label>
          <input
            type="text"
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder={t('form.fields.namePlaceholder')}
            required
            maxLength={120}
            disabled={busy}
            value={fields.name}
            onChange={set('name')}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className={labelClass}>
            {t('form.fields.email')}
          </label>
          <input
            type="email"
            id="contact-email"
            name="email"
            autoComplete="email"
            placeholder={t('form.fields.emailPlaceholder')}
            required
            disabled={busy}
            value={fields.email}
            onChange={set('email')}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className={labelClass}>
          {t('form.fields.subject')}
        </label>
        <input
          type="text"
          id="contact-subject"
          name="subject"
          placeholder={t('form.fields.subjectPlaceholder')}
          required
          maxLength={200}
          disabled={busy}
          value={fields.subject}
          onChange={set('subject')}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          {t('form.fields.message')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder={t('form.fields.messagePlaceholder')}
          required
          maxLength={4000}
          disabled={busy}
          value={fields.message}
          onChange={set('message')}
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-right text-[0.7rem] text-[#9EAC9E]">
          {fields.message.length}/4000
        </p>
      </div>

      {/* Error banner */}
      {status === 'error' && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[#6C7B76]">
          {t('form.disclaimer')}{' '}
          <Link
            href="/privacidad"
            className="font-semibold text-[#008000] underline-offset-2 hover:underline"
          >
            {t('form.privacy')}
          </Link>
        </p>

        <button
          type="submit"
          disabled={busy}
          className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-[#004700] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(0,71,0,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#008000] hover:shadow-[0_18px_36px_rgba(0,128,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] disabled:opacity-60 disabled:translate-y-0 disabled:cursor-not-allowed"
        >
          {busy ? <IconSpinner /> : <IconSend />}
          {busy ? 'Enviando…' : t('form.submit')}
          {!busy && (
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              <IconArrow />
            </span>
          )}
        </button>
      </div>
    </form>
  )
}
