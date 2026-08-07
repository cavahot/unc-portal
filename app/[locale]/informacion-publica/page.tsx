import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  await params
  return {
    title: 'Solicitar Información Pública | Universidad Nacional de Concepción',
    description:
      'Portal de acceso a la información pública de la UNC. Tres formas de solicitar: online, presencialmente o por correo electrónico, conforme a la Ley N° 5282/2014.',
  }
}

/* ─── Icons ───────────────────────────────────────────────────────────────── */

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}
      className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h10M12 7l5 5-5 5" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
    </svg>
  )
}

function IconScale() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M3 9l9-6 9 6" />
      <path d="M3 15h6l-3 6-3-6z" />
      <path d="M15 15h6l-3 6-3-6z" />
    </svg>
  )
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const CHANNELS = [
  {
    id:      'online',
    num:     '01',
    icon:    <IconGlobe />,
    label:   'Vía digital',
    title:   'Solicitud online',
    desc:    'Accedé directamente al Portal Unificado de Acceso a la Información Pública del Gobierno Nacional. Completá el formulario en línea con tus datos y la descripción de la información requerida.',
    cta:     'Solicitar información online',
    href:    'https://informacionpublica.paraguay.gov.py/#!/',
    accent:  '#5CFF5C',
    badge:   'Más rápido',
  },
  {
    id:      'presencial',
    num:     '02',
    icon:    <IconMapPin />,
    label:   'Vía presencial',
    title:   'En persona',
    desc:    'Acudí personalmente o comunicate con la Oficina de Acceso a la Información de la UNC. Un funcionario registrará tu solicitud mediante acta conforme al Art. 12 de la Ley N° 5282.',
    cta:     'Ver información de contacto',
    href:    '/contacto',
    accent:  '#60a5fa',
    badge:   null,
  },
  {
    id:      'email',
    num:     '03',
    icon:    <IconMail />,
    label:   'Vía correo',
    title:   'Por correo electrónico',
    desc:    'Enviá tu solicitud por correo electrónico a la oficina de acceso a la información correspondiente. Encontrá las direcciones de todas las oficinas en el catálogo oficial del gobierno.',
    cta:     'Ver catálogo de oficinas',
    href:    'https://informacionpublica.paraguay.gov.py/#!/estadistica/catalogo-institucion',
    accent:  '#c084fc',
    badge:   null,
  },
]

const REQUIRED_DATA = [
  'Nombres y apellidos completos',
  'Correo electrónico de contacto',
  'Nacionalidad',
  'Domicilio real',
  'Teléfono de contacto (opcional)',
  'Descripción clara y precisa de la información requerida',
  'Formato o soporte preferido para la respuesta',
]

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function InformacionPublicaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Grid dots */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(92,255,92,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
        {/* Glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#5CFF5C]/8 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-white/35">
            <Link href={`/${locale === 'es' ? '' : locale}`} className="transition-colors hover:text-white/70">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white/55">Información Pública</span>
          </nav>

          {/* Law badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.06] px-3 py-1.5">
            <span className="text-[#5CFF5C]"><IconScale /></span>
            <span className="text-xs font-bold text-[#5CFF5C]">Ley N° 5282/2014 — Libre Acceso a la Información Pública</span>
          </div>

          <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Portal de Acceso a la{' '}
            <span className="text-[#5CFF5C]">Información Pública</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            La Universidad Nacional de Concepción garantiza el derecho ciudadano de acceder a la
            información pública. Elegí la vía que más te resulte conveniente.
          </p>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap gap-3">
            {[
              { v: '3',        l: 'Vías de acceso' },
              { v: '15 días',  l: 'Plazo de respuesta' },
              { v: 'Gratuito', l: 'Sin costo' },
            ].map(s => (
              <div key={s.l}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3">
                <div>
                  <p className="text-base font-bold text-white">{s.v}</p>
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/35">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">

        {/* ── THREE CHANNELS ───────────────────────────────────────────────── */}
        <section aria-labelledby="channels-heading">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
              Vías de acceso
            </p>
            <h2 id="channels-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              ¿Cómo podés solicitar información?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">
              Según el artículo 12 de la Ley N° 5282, la solicitud puede realizarse por tres vías.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {CHANNELS.map((ch) => (
              <div
                key={ch.id}
                className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 transition-all hover:border-white/[0.15] hover:bg-white/[0.04]"
              >
                {/* Number */}
                <span
                  className="absolute right-5 top-5 font-mono text-5xl font-black leading-none opacity-[0.06]"
                  style={{ color: ch.accent }}
                  aria-hidden="true"
                >
                  {ch.num}
                </span>

                {/* Icon */}
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${ch.accent}12`, color: ch.accent }}
                >
                  {ch.icon}
                </div>

                {/* Badge */}
                {ch.badge && (
                  <span
                    className="mb-3 inline-block w-fit rounded-full px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-widest"
                    style={{ backgroundColor: `${ch.accent}20`, color: ch.accent }}
                  >
                    {ch.badge}
                  </span>
                )}

                {/* Label */}
                <p
                  className="mb-1 text-[0.6rem] font-extrabold uppercase tracking-widest"
                  style={{ color: ch.accent }}
                >
                  {ch.label}
                </p>

                {/* Title */}
                <h3 className="mb-3 text-lg font-bold text-white">
                  {ch.title}
                </h3>

                {/* Desc */}
                <p className="flex-1 text-sm leading-relaxed text-white/50">
                  {ch.desc}
                </p>

                {/* Divider */}
                <div className="my-5 h-px bg-white/[0.06]" />

                {/* CTA */}
                <a
                  href={ch.href}
                  target={ch.href.startsWith('http') ? '_blank' : undefined}
                  rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 text-sm font-bold transition-colors"
                  style={{ color: ch.accent }}
                  aria-label={`${ch.cta}${ch.href.startsWith('http') ? ' — abre en nueva pestaña' : ''}`}
                >
                  {ch.cta}
                  <IconArrow />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── LEGAL QUOTE ──────────────────────────────────────────────────── */}
        <section aria-labelledby="legal-heading">
          <div
            className="relative overflow-hidden rounded-2xl border border-[#5CFF5C]/[0.12] bg-[#5CFF5C]/[0.03] p-8 sm:p-10"
          >
            {/* Decorative quote mark */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-4 left-6 font-serif text-[8rem] font-black leading-none text-[#5CFF5C]/[0.06]"
            >
              "
            </span>

            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[#5CFF5C]"><IconScale /></span>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
                  Art. 12 — Ley N° 5282/2014
                </p>
              </div>
              <blockquote className="text-sm leading-7 text-white/60 sm:text-base sm:leading-8">
                "Toda persona interesada en acceder a la información pública, deberá presentar una
                solicitud ante la oficina establecida en la fuente pública correspondiente,{' '}
                <strong className="font-semibold text-white/80">
                  personalmente, por correo electrónico, en forma escrita o verbal
                </strong>, y en este último caso, se extenderá un acta. La presentación contendrá la
                identificación del solicitante, su domicilio real, la descripción clara y precisa de
                la información pública que requiere, y finalmente, el formato o soporte preferido."
              </blockquote>
            </div>
          </div>
        </section>

        {/* ── REQUIRED DATA + CTA ──────────────────────────────────────────── */}
        <section>
          <div className="grid gap-5 lg:grid-cols-2">

            {/* Required data checklist */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7">
              <p className="mb-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-white/35">
                Para solicitudes escritas y por email
              </p>
              <h3 className="mb-6 text-lg font-bold text-white">
                Información que debés proveer
              </h3>
              <ul className="flex flex-col gap-3">
                {REQUIRED_DATA.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/60">
                    <span className="mt-0.5 shrink-0 text-[#5CFF5C]">
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Portal CTA */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.04] p-7">
              <div>
                <p className="mb-2 text-[0.6rem] font-extrabold uppercase tracking-widest text-[#5CFF5C]">
                  Acceso directo
                </p>
                <h3 className="text-xl font-bold text-white">
                  Portal Unificado del Gobierno Nacional
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  El Portal de Acceso de Información Pública de Paraguay es la plataforma oficial
                  donde podés realizar tu solicitud en línea, consultar el estado de trámites
                  anteriores y acceder al catálogo de instituciones públicas.
                </p>

                {/* URL display */}
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                  <span className="text-[#5CFF5C] opacity-60"><IconGlobe /></span>
                  <span className="truncate font-mono text-xs text-white/40">
                    informacionpublica.paraguay.gov.py
                  </span>
                </div>
              </div>

              <a
                href="https://informacionpublica.paraguay.gov.py/#!/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#5CFF5C] px-6 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Solicitar información online
                <IconArrow />
              </a>

              <p className="mt-3 text-[0.6rem] text-white/25">
                Serás redirigido al portal oficial del Gobierno de la República del Paraguay.
              </p>
            </div>
          </div>
        </section>

        {/* ── CONTACT STRIP ────────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                <IconMapPin />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Oficina de Información Pública — UNC</p>
                <p className="text-xs text-white/40">Rectorado · Ruta PY05, Km 210 · Concepción, Paraguay</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:secgral@unc.edu.py"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/60 transition-all hover:border-white/30 hover:text-white"
              >
                <IconMail />
                secgral@unc.edu.py
              </a>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/60 transition-all hover:border-white/30 hover:text-white"
              >
                Ver todos los contactos
                <IconArrow />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
