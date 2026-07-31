import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/i18n/server'
import Reveal from '@/components/motion/Reveal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.contacto')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/* =========================================================
   ICONS
   ========================================================= */

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M12 21s7-5.3 7-12a7 7 0 10-14 0c0 6.7 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.3" strokeWidth={1.8} />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1l-1.3 1.3a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.8} />
      <path d="M4 7l8 6 8-6" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
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

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

/* =========================================================
   INFO CARD
   ========================================================= */

function InfoCard({
  icon,
  label,
  value,
  href,
  actionLabel,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  actionLabel: string
  delay?: number
}) {
  return (
    <Reveal delay={delay}>
      <div className="flex h-full flex-col rounded-[1.25rem] border border-[#D7E0DB] bg-white p-6 shadow-[0_12px_36px_rgba(7,42,15,0.07)] transition-all duration-300 hover:border-[#37D448]/60 hover:shadow-[0_22px_50px_rgba(0,71,0,0.13)]">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6FFE6] text-[#008000]">
          {icon}
        </div>

        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
          {label}
        </p>

        <p className="mt-2 flex-1 whitespace-pre-line text-base font-semibold leading-6 text-[#09231D]">
          {value}
        </p>

        {href && (
          <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="group mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#008000] transition-colors hover:text-[#004700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
          >
            {actionLabel}
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              <IconArrow />
            </span>
          </a>
        )}
      </div>
    </Reveal>
  )
}

/* =========================================================
   CONTACT FORM (mailto-based — no backend required)
   ========================================================= */

function ContactForm({ t }: { t: (key: string) => string }) {
  return (
    <form
      action="mailto:secgral@unc.edu.py"
      method="GET"
      encType="text/plain"
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1.5 block text-sm font-semibold text-[#09231D]"
          >
            {t('form.fields.name')}
          </label>
          <input
            type="text"
            id="contact-name"
            name="name"
            placeholder={t('form.fields.namePlaceholder')}
            required
            className="w-full rounded-xl border border-[#D7E0DB] bg-white px-4 py-3 text-sm text-[#09231D] placeholder:text-[#9EAC9E] transition-colors focus:border-[#37D448] focus:outline-none focus:ring-2 focus:ring-[#5CFF5C]/30"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="mb-1.5 block text-sm font-semibold text-[#09231D]"
          >
            {t('form.fields.email')}
          </label>
          <input
            type="email"
            id="contact-email"
            name="email"
            placeholder={t('form.fields.emailPlaceholder')}
            required
            className="w-full rounded-xl border border-[#D7E0DB] bg-white px-4 py-3 text-sm text-[#09231D] placeholder:text-[#9EAC9E] transition-colors focus:border-[#37D448] focus:outline-none focus:ring-2 focus:ring-[#5CFF5C]/30"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="mb-1.5 block text-sm font-semibold text-[#09231D]"
        >
          {t('form.fields.subject')}
        </label>
        <input
          type="text"
          id="contact-subject"
          name="subject"
          placeholder={t('form.fields.subjectPlaceholder')}
          required
          className="w-full rounded-xl border border-[#D7E0DB] bg-white px-4 py-3 text-sm text-[#09231D] placeholder:text-[#9EAC9E] transition-colors focus:border-[#37D448] focus:outline-none focus:ring-2 focus:ring-[#5CFF5C]/30"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-semibold text-[#09231D]"
        >
          {t('form.fields.message')}
        </label>
        <textarea
          id="contact-message"
          name="body"
          rows={5}
          placeholder={t('form.fields.messagePlaceholder')}
          required
          className="w-full resize-none rounded-xl border border-[#D7E0DB] bg-white px-4 py-3 text-sm text-[#09231D] placeholder:text-[#9EAC9E] transition-colors focus:border-[#37D448] focus:outline-none focus:ring-2 focus:ring-[#5CFF5C]/30"
        />
      </div>

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
          className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-[#004700] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(0,71,0,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#008000] hover:shadow-[0_18px_36px_rgba(0,128,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
        >
          <IconSend />
          {t('form.submit')}
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            <IconArrow />
          </span>
        </button>
      </div>
    </form>
  )
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function ContactoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.contacto')
  const tc = await getT(locale, 'common')

  const infoCards = [
    {
      icon: <IconLocation />,
      label: t('info.address.label'),
      value: t('info.address.value'),
      href: 'https://maps.google.com/?q=Universidad+Nacional+de+Concepcion+Paraguay',
      actionLabel: t('info.address.action'),
    },
    {
      icon: <IconPhone />,
      label: t('info.phone.label'),
      value: t('info.phone.value'),
      href: 'tel:+5953312410690',
      actionLabel: t('info.phone.action'),
    },
    {
      icon: <IconMail />,
      label: t('info.email.label'),
      value: t('info.email.value'),
      href: 'mailto:secgral@unc.edu.py',
      actionLabel: t('info.email.action'),
    },
    {
      icon: <IconClock />,
      label: t('info.hours.label'),
      value: t('info.hours.value'),
      actionLabel: t('info.hours.action'),
    },
  ]

  return (
    <>
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-white/60">
              <li>
                <Link href="/" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">
                {t('breadcrumb.contact')}
              </li>
            </ol>
          </nav>

          <Reveal>
            <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
              {t('hero.label')}
            </span>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {t('hero.description')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          INFO CARDS
          ===================================================== */}
      <section
        aria-label="Información de contacto"
        className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-8 sm:pb-24"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {infoCards.map((card, i) => (
              <InfoCard key={card.label} {...card} delay={i * 70} />
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          FORM + MAP
          ===================================================== */}
      <section
        aria-labelledby="form-title"
        className="bg-white py-20 sm:py-24"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:items-start">

            {/* Form */}
            <Reveal>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {tc('contact')}
                </span>

                <h2
                  id="form-title"
                  className="mt-4 font-serif text-3xl font-bold leading-tight tracking-[-0.03em] text-[#09231D] sm:text-4xl"
                >
                  {t('form.title')}
                </h2>

                <p className="mt-3 text-base leading-7 text-[#6C7B76]">
                  {t('form.description')}
                </p>

                <div className="mt-8">
                  <ContactForm t={t} />
                </div>
              </div>
            </Reveal>

            {/* Map + social */}
            <Reveal delay={120}>
              <div className="flex flex-col gap-6">
                {/* Map embed */}
                <div className="overflow-hidden rounded-[1.35rem] border border-[#D7E0DB] shadow-[0_12px_36px_rgba(7,42,15,0.08)]">
                  <iframe
                    title="Ubicación de la Universidad Nacional de Concepción"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3710.2!2d-57.4344!3d-23.4075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x945c5a1b1b1b1b1b%3A0x1b1b1b1b1b1b1b1b!2sUniversidad%20Nacional%20de%20Concepci%C3%B3n!5e0!3m2!1ses!2spy!4v1234567890"
                    width="100%"
                    height="280"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block"
                  />
                </div>

                {/* Social + direct links */}
                <div className="rounded-[1.25rem] border border-[#D7E0DB] bg-[#F4F7F5] p-6">
                  <p className="mb-4 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
                    {t('social.title')}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'Facebook', href: 'https://www.facebook.com/people/unc_py/100089915906133/', color: '#1877F2' },
                      { label: 'Instagram', href: 'https://www.instagram.com/unc_py/', color: '#E1306C' },
                      { label: 'X / Twitter', href: 'https://x.com/UncConcepcion', color: '#14171A' },
                      { label: 'YouTube', href: 'https://youtube.com/@universidadnacionaldeconce5302', color: '#FF0000' },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-[#D7E0DB] bg-white px-4 py-2 text-xs font-bold text-[#09231D] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#37D448]/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                      >
                        {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
