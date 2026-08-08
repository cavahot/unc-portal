import type { ReactNode } from 'react'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'

/* =========================================================
   TYPES
   ========================================================= */

export interface WorkArea {
  icon: string         // emoji
  title: string
  description: string
}

export interface ActionItem {
  label: string
  href: string
  external?: boolean
  primary?: boolean
}

export interface AcademicSectionPageProps {
  // Core content
  title: string
  description: string

  // Optional chrome
  label?: string
  breadcrumb?: Array<{ label: string; href: string }>

  // Work areas grid
  areas?: WorkArea[]
  areasTitle?: string

  // CTA row above footer
  actions?: ActionItem[]

  // Contact block
  contactEmail?: string
  contactLabel?: string

  // Extra slot for future rich sections
  afterAreas?: ReactNode

  // State flag — shows tasteful "in development" chip
  underConstruction?: boolean
}

/* =========================================================
   ICONS
   ========================================================= */

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14 21 3" />
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

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  )
}

/* =========================================================
   AREA CARD
   ========================================================= */

function AreaCard({ area, index }: { area: WorkArea; index: number }) {
  return (
    <Reveal delay={index * 60}>
      <div className="flex h-full flex-col rounded-[1.25rem] border border-[#D7E0DB] bg-white p-6 shadow-[0_8px_28px_rgba(7,42,15,0.06)] transition-all duration-300 hover:border-[#37D448]/60 hover:shadow-[0_18px_44px_rgba(0,71,0,0.11)]">
        <span className="text-3xl leading-none" aria-hidden="true">{area.icon}</span>
        <h3 className="mt-4 font-serif text-lg font-bold text-[#09231D]">{area.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-[#6C7B76]">{area.description}</p>
      </div>
    </Reveal>
  )
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function AcademicSectionPage({
  title,
  description,
  label = 'Área académica',
  breadcrumb = [],
  areas = [],
  areasTitle = 'Áreas de trabajo',
  actions = [],
  contactEmail = 'secgral@unc.edu.py',
  contactLabel = '¿Consultas sobre esta área?',
  afterAreas,
  underConstruction = false,
}: AcademicSectionPageProps) {
  const defaultBreadcrumb = [{ label: 'Inicio', href: '/' }, ...breadcrumb]

  return (
    <>
      {/* =======================================================
          HERO
          ======================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          {defaultBreadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                {defaultBreadcrumb.map((item, i) => (
                  <li key={item.href} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className="select-none">/</span>}
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="select-none">/</span>
                  <span className="font-semibold text-white" aria-current="page">{title}</span>
                </li>
              </ol>
            </nav>
          )}

          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
                {label}
              </span>
              {underConstruction && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-amber-300 ring-1 ring-amber-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                  En desarrollo
                </span>
              )}
            </div>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {description}
            </p>

            {/* CTA actions */}
            {actions.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    target={action.external ? '_blank' : undefined}
                    rel={action.external ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] ${
                      action.primary
                        ? 'bg-white text-[#004700] shadow-md hover:bg-[#E6FFE6] hover:shadow-lg'
                        : 'border border-white/30 text-white hover:border-white/60 hover:bg-white/10'
                    }`}
                  >
                    {action.label}
                    {action.external && <IconExternal />}
                  </a>
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* =======================================================
          WORK AREAS
          ======================================================= */}
      <section
        aria-labelledby="areas-title"
        className="bg-[#F4F7F5] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {areas.length > 0 ? (
            <>
              <Reveal>
                <h2
                  id="areas-title"
                  className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl"
                >
                  {areasTitle}
                </h2>
              </Reveal>

              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {areas.map((area, i) => (
                  <AreaCard key={area.title} area={area} index={i} />
                ))}
              </div>
            </>
          ) : (
            /* Empty-state — underConstruction placeholder */
            <Reveal>
              <div className="mx-auto max-w-xl py-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6FFE6] text-[#008000]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#09231D]">
                  Contenido en preparación
                </h2>
                <p className="mt-3 text-base leading-7 text-[#6C7B76]">
                  Esta sección está siendo desarrollada. Próximamente encontrarás aquí toda la información
                  sobre programas, proyectos y actividades del área.
                </p>
              </div>
            </Reveal>
          )}

          {/* Extra slot */}
          {afterAreas}
        </div>
      </section>

      {/* =======================================================
          CONTACT BLOCK
          ======================================================= */}
      <section className="border-t border-[#D7E0DB] bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6FFE6] text-[#008000]">
                <IconMail />
              </div>

              <div className="flex-1">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
                  Contacto
                </p>
                <p className="mt-1 text-lg font-semibold text-[#09231D]">{contactLabel}</p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-1 inline-block text-sm text-[#6C7B76] underline-offset-2 hover:text-[#004700] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] rounded"
                >
                  {contactEmail}
                </a>
              </div>

              <div className="shrink-0">
                <Link
                  href="/contacto"
                  className="group inline-flex items-center gap-2 rounded-full border border-[#D7E0DB] bg-[#F4F7F5] px-5 py-2.5 text-sm font-bold text-[#09231D] shadow-sm transition-all hover:border-[#37D448]/60 hover:bg-white hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  Más información
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    <IconArrow />
                  </span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
