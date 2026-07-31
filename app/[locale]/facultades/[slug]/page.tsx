import { notFound } from 'next/navigation'
import { getT } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import { getFacultadBySlug } from '@/lib/cms/queries/facultades'
import { getCarrerasByFacultad, type CarreraPopulada } from '@/lib/cms/queries/carreras'
import Reveal from '@/components/motion/Reveal'

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params
  const facultad = await getFacultadBySlug(slug).catch(() => null)
  if (!facultad) return { title: 'Facultad — UNC' }
  return {
    title: `${facultad.nombre} — UNC`,
    description: facultad.descripcion ?? `${facultad.nombre} — Universidad Nacional de Concepción`,
  }
}

export default async function FacultadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getT(locale, 'pages.facultades')
  const tc = await getT(locale, 'pages.carreras')

  const [facultad, carreras] = await Promise.all([
    getFacultadBySlug(slug).catch(() => null),
    getCarrerasByFacultad(slug).catch((): CarreraPopulada[] => []),
  ])

  if (!facultad) notFound()

  const modalidadColors: Record<string, string> = {
    Presencial: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    Semipresencial: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    Virtual: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <Reveal>
          <nav className="mb-8 flex items-center gap-2 text-sm text-white/40">
            <Link href="/" className="transition-colors hover:text-white">{t('home')}</Link>
            <span>/</span>
            <Link href="/facultades" className="transition-colors hover:text-white">{t('facultades')}</Link>
            <span>/</span>
            <span className="line-clamp-1 text-white/60">{facultad.nombre}</span>
          </nav>
        </Reveal>

        {/* Hero */}
        <Reveal delay={60}>
          <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-12">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
              {t('portalLabel')}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {facultad.nombre}
            </h1>

            {facultad.decano && (
              <p className="mt-3 text-lg text-white/50">
                <span className="font-semibold text-white/60">{t('decano')}:</span>{' '}
                {facultad.decano}
              </p>
            )}

            {facultad.descripcion && (
              <p className="mt-4 max-w-2xl leading-relaxed text-white/60">{facultad.descripcion}</p>
            )}

            {/* Contact info */}
            {(facultad.email || facultad.telefono) && (
              <div className="mt-6 flex flex-wrap gap-4">
                {facultad.email && (
                  <a
                    href={`mailto:${facultad.email}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/60 transition-all hover:border-[#5CFF5C]/30 hover:text-white"
                  >
                    {/* Email icon */}
                    <svg className="h-4 w-4 text-[#5CFF5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {facultad.email}
                  </a>
                )}
                {facultad.telefono && (
                  <a
                    href={`tel:${facultad.telefono}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/60 transition-all hover:border-[#5CFF5C]/30 hover:text-white"
                  >
                    {/* Phone icon */}
                    <svg className="h-4 w-4 text-[#5CFF5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {facultad.telefono}
                  </a>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Carreras section */}
        <Reveal delay={120}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{t('carrerasTitle')}</h2>
            {carreras.length > 0 && (
              <span className="rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 px-3 py-1 text-xs font-bold text-[#5CFF5C]">
                {carreras.length} {carreras.length === 1 ? 'carrera' : 'carreras'}
              </span>
            )}
          </div>
        </Reveal>

        {carreras.length === 0 ? (
          <Reveal delay={160}>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] py-16 text-center">
              <p className="text-white/40">{tc('empty')}</p>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {carreras.map((c, i) => {
              const modalidadClass = c.modalidad
                ? (modalidadColors[c.modalidad] ?? 'bg-white/5 text-white/50 border-white/10')
                : ''
              return (
                <Reveal key={c.slug} delay={140 + i * 40}>
                  <Link
                    href={`/carreras/${c.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
                  >
                    <h3 className="mb-1 font-semibold leading-snug text-white transition-colors group-hover:text-[#8AFF8A]">
                      {c.nombre}
                    </h3>
                    {c.titulo && (
                      <p className="mb-3 text-xs text-white/50">{c.titulo}</p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {c.duracion && (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                          {c.duracion} {c.duracion === 1 ? 'año' : 'años'}
                        </span>
                      )}
                      {c.modalidad && (
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${modalidadClass}`}>
                          {c.modalidad}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-[#5CFF5C]/60 transition-colors group-hover:text-[#5CFF5C]">
                      {tc('verDetalle')} →
                    </p>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}

        {/* Back link */}
        <Reveal delay={200}>
          <div className="mt-16 border-t border-white/10 pt-8">
            <Link
              href="/facultades"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-[#5CFF5C]/40 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('backToFacultades')}
            </Link>
          </div>
        </Reveal>

      </div>
    </div>
  )
}
