import { notFound } from 'next/navigation'
import { getT } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import { getCarreraBySlug } from '@/lib/cms/queries/carreras'
import Reveal from '@/components/motion/Reveal'

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const carrera = await getCarreraBySlug(slug).catch(() => null)
  if (!carrera) {
    const t = await getT(locale, 'pages.carreras')
    return { title: t('empty') }
  }
  return {
    title: `${carrera.nombre} — UNC`,
    description: carrera.descripcion ?? `${carrera.titulo} — ${carrera.facultad?.nombre ?? ''}`,
  }
}

export default async function CarreraDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getT(locale, 'pages.carreras')

  const carrera = await getCarreraBySlug(slug).catch(() => null)
  if (!carrera) notFound()

  const modalidadColors: Record<string, string> = {
    Presencial: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    Semipresencial: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    Virtual: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  }
  const modalidadClass = carrera.modalidad
    ? (modalidadColors[carrera.modalidad] ?? 'bg-white/5 text-white/50 border-white/10')
    : ''

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <Reveal>
          <nav className="mb-8 flex items-center gap-2 text-sm text-white/40">
            <Link href="/" className="transition-colors hover:text-white">{t('home')}</Link>
            <span>/</span>
            <Link href="/carreras" className="transition-colors hover:text-white">{t('carreras')}</Link>
            <span>/</span>
            <span className="line-clamp-1 text-white/60">{carrera.nombre}</span>
          </nav>
        </Reveal>

        {/* Hero */}
        <Reveal delay={60}>
          <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-12">
            {/* Facultad badge */}
            {carrera.facultad && (
              <Link
                href={`/facultades/${carrera.facultad.slug}`}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 px-3 py-1 text-xs font-semibold text-[#5CFF5C] transition-colors hover:bg-[#5CFF5C]/10"
              >
                {carrera.facultad.nombre}
              </Link>
            )}

            {/* Modalidad badge */}
            {carrera.modalidad && (
              <span className={`ml-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${modalidadClass}`}>
                {carrera.modalidad}
              </span>
            )}

            <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {carrera.nombre}
            </h1>

            {carrera.titulo && (
              <p className="mt-3 text-lg text-white/50">{carrera.titulo}</p>
            )}
          </div>
        </Reveal>

        {/* Data grid */}
        <Reveal delay={120}>
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Duration */}
            {carrera.duracion && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#5CFF5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">Duración</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {carrera.duracion} {carrera.duracion === 1 ? 'año' : 'años'}
                </p>
              </div>
            )}

            {/* Título */}
            {carrera.titulo && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#5CFF5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">{t('titulo')}</p>
                </div>
                <p className="text-sm font-semibold text-white">{carrera.titulo}</p>
              </div>
            )}

            {/* Resolución */}
            {carrera.resolucion && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#5CFF5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">Resolución</p>
                </div>
                <p className="text-sm font-semibold text-white">{carrera.resolucion}</p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Description */}
        {carrera.descripcion && (
          <Reveal delay={180}>
            <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <p className="leading-relaxed text-white/70">{carrera.descripcion}</p>
            </div>
          </Reveal>
        )}

        {/* Back link */}
        <Reveal delay={220}>
          <div className="border-t border-white/10 pt-8">
            <Link
              href="/carreras"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-[#5CFF5C]/40 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('backToCarreras')}
            </Link>
          </div>
        </Reveal>

      </div>
    </div>
  )
}
