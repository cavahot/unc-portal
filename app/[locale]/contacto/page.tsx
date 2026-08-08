import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/i18n/server'
import Reveal from '@/components/motion/Reveal'
import ContactForm from '@/components/contact/ContactForm'

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
   SOCIAL ICONS
   ========================================================= */

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M24 12.073C24 5.41 18.627 0 12 0S0 5.41 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.883v2.272h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
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
                  <ContactForm />
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
                    {([
                      { label: 'Facebook',   href: 'https://www.facebook.com/profile.php?id=100089915906133', icon: <IconFacebook />, color: '#1877F2' },
                      { label: 'Instagram',  href: 'https://www.instagram.com/unc_py/',                        icon: <IconInstagram />, color: '#E1306C' },
                      { label: 'X',          href: 'https://x.com/UncConcepcion',                              icon: <IconX />,        color: '#14171A' },
                      { label: 'YouTube',    href: 'https://youtube.com/@universidadnacionaldeconce5302',       icon: <IconYouTube />,  color: '#FF0000' },
                    ] as const).map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Seguinos en ${s.label}`}
                        className="group inline-flex items-center gap-2 rounded-full border border-[#D7E0DB] bg-white px-4 py-2 text-xs font-bold text-[#09231D] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#37D448]/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                      >
                        <span style={{ color: s.color }}>{s.icon}</span>
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
