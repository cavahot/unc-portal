import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { getT } from '@/lib/i18n/server'
import { getAuthorities, type Authority } from '@/lib/cms/queries/autoridades'

/* ── generateMetadata ─────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.autoridades')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .replace(/^(Prof\.|Dr\.|Dra\.|Ing\.|Abog\.|Mg\.|Agr\.)\s*/gi, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function Avatar({
  photoUrl, photoAlt, photoBlur, initials, size = 'lg',
}: {
  photoUrl?: string | null
  photoAlt?: string | null
  photoBlur?: string | null
  initials: string
  size?: 'lg' | 'xl'
}) {
  const dim = size === 'xl' ? 180 : 100
  const cls = size === 'xl'
    ? 'h-40 w-40 sm:h-44 sm:w-44 rounded-2xl'
    : 'h-24 w-24 rounded-2xl'

  if (photoUrl) {
    return (
      <div className={`${cls} relative overflow-hidden shrink-0`}>
        <Image
          src={photoUrl}
          alt={photoAlt ?? initials}
          width={dim}
          height={dim}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          placeholder={photoBlur ? 'blur' : 'empty'}
          blurDataURL={photoBlur ?? undefined}
        />
        {/* Green overlay on hover */}
        <div className="absolute inset-0 bg-[#004700]/0 transition-colors duration-300 group-hover:bg-[#004700]/20" />
      </div>
    )
  }

  const bgCls = size === 'xl' ? 'bg-[#004700]' : 'bg-[#2D5C3A]'
  const textCls = size === 'xl' ? 'text-3xl' : 'text-lg'

  return (
    <div
      className={`${cls} ${bgCls} flex shrink-0 items-center justify-center font-serif font-bold text-white ${textCls} transition-all duration-300 group-hover:ring-4 group-hover:ring-[#5CFF5C]/40`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

/* ── Leader Card (Rector / Vicerrector) ───────────────────────────────────── */

function LeaderCard({ authority, cvLabel, delay = 0 }: { authority: Authority; cvLabel: string; delay?: number }) {
  const initials = getInitials(authority.name)
  const hasCv = !!authority.cvUrl
  const isRector = authority.type === 'rector'

  return (
    <Reveal delay={delay}>
      <div className={`group flex flex-col gap-6 overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_16px_48px_rgba(7,42,15,0.1)] transition-shadow duration-300 hover:shadow-[0_24px_64px_rgba(7,42,15,0.16)] sm:flex-row ${isRector ? 'border-[#008000]/30 ring-1 ring-[#008000]/15' : 'border-[#D7E0DB]'}`}>
        {/* Photo panel */}
        <div className={`flex shrink-0 items-center justify-center p-8 sm:w-56 sm:items-start sm:p-8 ${isRector ? 'bg-[#F0F9F0]' : 'bg-[#F4F7F5]'}`}>
          <Avatar
            photoUrl={authority.photoUrl}
            photoAlt={authority.photoAlt}
            photoBlur={authority.photoBlur}
            initials={initials}
            size="xl"
          />
        </div>

        {/* Info panel */}
        <div className="flex flex-1 flex-col justify-center gap-3 p-6 sm:py-8 sm:pr-8">
          {/* Role badge */}
          <span className={`w-fit rounded-full px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] ${isRector ? 'bg-[#004700] text-white' : 'bg-[#004700]/10 text-[#004700]'}`}>
            {authority.role}
          </span>

          {/* Name with CV hover */}
          <div className="group/name relative">
            <h2 className="cursor-default font-serif text-xl font-bold leading-snug text-[#09231D] sm:text-2xl">
              {authority.name}
            </h2>

            {hasCv && (
              <div className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 translate-y-1 opacity-0 transition-all duration-200 group-hover/name:pointer-events-auto group-hover/name:translate-y-0 group-hover/name:opacity-100">
                <a
                  href={authority.cvUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D7E0DB] bg-white px-3 py-1.5 text-xs font-bold text-[#004700] shadow-[0_4px_12px_rgba(7,42,15,0.12)] transition-colors hover:border-[#008000]/30 hover:bg-[#E6FFE6]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {cvLabel}
                </a>
              </div>
            )}
          </div>

          {/* Bio */}
          {authority.bio && (
            <p className="text-sm leading-6 text-[#6C7B76]">{authority.bio}</p>
          )}

          {/* Email */}
          {authority.email && (
            <a
              href={`mailto:${authority.email}`}
              className="mt-1 inline-flex w-fit items-center gap-1.5 text-xs text-[#6C7B76] transition-colors hover:text-[#004700]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              {authority.email}
            </a>
          )}
        </div>
      </div>
    </Reveal>
  )
}

/* ── Dean Card ────────────────────────────────────────────────────────────── */

function DeanCard({ authority, cvLabel, delay = 0 }: { authority: Authority; cvLabel: string; delay?: number }) {
  const initials = getInitials(authority.name)
  const hasCv = !!authority.cvUrl

  return (
    <Reveal delay={delay}>
      <div className="group flex h-full flex-col items-center rounded-[1.25rem] border border-[#D7E0DB] bg-white p-7 text-center shadow-[0_8px_24px_rgba(7,42,15,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(7,42,15,0.12)]">
        {/* Photo */}
        <div className="relative mb-5">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl transition-all duration-300 group-hover:ring-4 group-hover:ring-[#5CFF5C]/40">
            {authority.photoUrl ? (
              <>
                <Image
                  src={authority.photoUrl}
                  alt={authority.photoAlt ?? initials}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  placeholder={authority.photoBlur ? 'blur' : 'empty'}
                  blurDataURL={authority.photoBlur ?? undefined}
                />
                <div className="absolute inset-0 bg-[#004700]/0 transition-colors duration-300 group-hover:bg-[#004700]/15" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#2D5C3A] font-serif text-lg font-bold text-white">
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Faculty */}
        {authority.faculty && (
          <p className="mb-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
            {authority.faculty}
          </p>
        )}

        {/* Role */}
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#6C7B76]">
          {authority.role}
        </p>

        {/* Name with CV hover */}
        <div className="group/name relative">
          <h3 className="cursor-default font-serif text-sm font-bold leading-snug text-[#09231D]">
            {authority.name}
          </h3>

          {hasCv && (
            <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 translate-y-1 whitespace-nowrap opacity-0 transition-all duration-200 group-hover/name:pointer-events-auto group-hover/name:translate-y-0 group-hover/name:opacity-100">
              <a
                href={authority.cvUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D7E0DB] bg-white px-3 py-1.5 text-xs font-bold text-[#004700] shadow-[0_4px_12px_rgba(7,42,15,0.12)] transition-colors hover:border-[#008000]/30 hover:bg-[#E6FFE6]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {cvLabel}
              </a>
            </div>
          )}
        </div>

        {/* Email if available */}
        {authority.email && (
          <a
            href={`mailto:${authority.email}`}
            className="mt-3 text-[0.65rem] text-[#6C7B76] transition-colors hover:text-[#004700]"
          >
            {authority.email}
          </a>
        )}
      </div>
    </Reveal>
  )
}

/* ── Static fallback ──────────────────────────────────────────────────────── */

const STATIC_AUTHORITIES: Authority[] = [
  { id: '1', name: 'Prof. Dr. Clarito Rojas Marín', role: 'Rector', type: 'rector', faculty: null, photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: 'Autoridad máxima de la Universidad Nacional de Concepción. Representa a la institución ante organismos nacionales e internacionales.', email: null, order: 1 },
  { id: '2', name: 'Prof. Dr. Arnaldo Miguel Ferreira Cabañas', role: 'Vicerrector', type: 'vicerrector', faculty: null, photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: 'Apoya y complementa la gestión rectoral en la conducción académica e institucional de la universidad.', email: null, order: 2 },
  { id: '3', name: 'Prof. Dr. Carlos Ramón Lima De León', role: 'Decano', type: 'decano', faculty: 'Facultad de Odontología', photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: null, email: null, order: 10 },
  { id: '4', name: 'Prof. Ing. Agr. Derlys Fernando López Avalos', role: 'Decano', type: 'decano', faculty: 'Facultad de Ciencias Agrarias', photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: null, email: null, order: 11 },
  { id: '5', name: 'Prof. Mg. Gerardo Lang Ferri', role: 'Decano', type: 'decano', faculty: 'Facultad de Ciencias Económicas y Administrativas', photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: null, email: null, order: 12 },
  { id: '6', name: 'Prof. Dr. Roberto Gustavo Barrios', role: 'Decano', type: 'decano', faculty: 'Facultad de Medicina', photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: null, email: null, order: 13 },
  { id: '7', name: 'Prof. Dra. María Concepción Araujo De Benítez', role: 'Decana', type: 'decano', faculty: 'Facultad de Humanidades y Ciencias de la Educación', photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: null, email: null, order: 14 },
  { id: '8', name: 'Prof. Dr. Jorge Daniel Mello Román', role: 'Decano', type: 'decano', faculty: 'Facultad de Ciencias Exactas y Tecnológica', photoUrl: null, photoAlt: null, photoBlur: null, cvUrl: null, bio: null, email: null, order: 15 },
]

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function AutoridadesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.autoridades')

  let authorities: Authority[] = []

  try {
    authorities = await getAuthorities()
  } catch {
    authorities = STATIC_AUTHORITIES
  }

  if (authorities.length === 0) {
    authorities = STATIC_AUTHORITIES
  }

  const leaders = authorities.filter((a) => a.type === 'rector' || a.type === 'vicerrector')
  const deans = authorities.filter((a) => a.type === 'decano')
  const others = authorities.filter((a) => a.type === 'secretario' || a.type === 'director')
  const cvLabel = 'Currículum Vitae'

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-white/60">
              <li>
                <Link href={`/${locale === 'es' ? '' : locale}`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">{t('breadcrumb.page')}</li>
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

      {/* ── LEADERS (Rector + Vicerrector) ───────────────────────────────── */}
      {leaders.length > 0 && (
        <section className="relative z-10 -mt-8 bg-[#F4F7F5] pb-16 pt-16">
          <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mb-10">
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('hero.label')}
                </span>
                <h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl">
                  Rectorado
                </h2>
              </div>
            </Reveal>

            <div className="flex flex-col gap-5">
              {leaders.map((authority, i) => (
                <LeaderCard
                  key={authority.id}
                  authority={authority}
                  cvLabel={cvLabel}
                  delay={i * 80}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DEANS ────────────────────────────────────────────────────────── */}
      {deans.length > 0 && (
        <section className={`bg-[#F4F7F5] pb-20 sm:pb-24 ${leaders.length > 0 ? 'pt-8' : 'relative z-10 -mt-8 pt-16'}`}>
          <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mb-10">
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  {t('section.label')}
                </span>
                <h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl">
                  {t('section.title')}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#6C7B76]">
                  {t('section.description')}
                </p>
              </div>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {deans.map((authority, i) => (
                <DeanCard
                  key={authority.id}
                  authority={authority}
                  cvLabel={cvLabel}
                  delay={i * 60}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── OTHERS (Secretarios, Directores) ─────────────────────────────── */}
      {others.length > 0 && (
        <section className="bg-[#F4F7F5] pb-20 sm:pb-24">
          <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mb-10">
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                  Gestión institucional
                </span>
                <h2 className="mt-3 font-serif text-2xl font-bold tracking-[-0.03em] text-[#09231D]">
                  Otras autoridades
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((authority, i) => (
                <DeanCard
                  key={authority.id}
                  authority={authority}
                  cvLabel={cvLabel}
                  delay={i * 60}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NOTE ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F7F5] pb-4">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-[1.1rem] border border-[#D7E0DB] bg-white p-6 shadow-[0_8px_24px_rgba(7,42,15,0.05)]">
              <div className="flex gap-3">
                <div className="mt-0.5 h-5 w-5 shrink-0 text-[#008000]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-sm leading-6 text-[#6C7B76]">{t('note')}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── ORGANIGRAMA LINK ─────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                {t('organigrama.label')}
              </span>
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-[-0.03em] text-[#09231D]">
                {t('organigrama.title')}
              </h2>
              <p className="mt-3 text-base leading-7 text-[#6C7B76]">
                {t('organigrama.description')}
              </p>
              <Link
                href={`/${locale === 'es' ? '' : locale + '/'}organigrama`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#004700] px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
              >
                {t('organigrama.link')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
