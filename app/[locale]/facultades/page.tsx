import { getT } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import { getFacultades } from '@/lib/cms/queries/facultades'
import { getCarreras } from '@/lib/cms/queries/carreras'
import Reveal from '@/components/motion/Reveal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.facultades')
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  }
}

export default async function FacultadesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.facultades')

  const [facultades, carreras] = await Promise.all([
    getFacultades(),
    getCarreras(),
  ])

  // Build carrera count per facultad slug
  const countBySlug = new Map<string, number>()
  for (const c of carreras) {
    const slug = c.facultad?.slug
    if (slug) countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1)
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <Reveal>
          <div className="mb-12">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
              {t('portalLabel')}
            </p>
            <h1 className="text-4xl font-bold text-white md:text-5xl">{t('heading')}</h1>
            <p className="mt-2 text-white/50">{t('subheading')}</p>
          </div>
        </Reveal>

        {/* Empty state */}
        {facultades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-white/40">{t('empty')}</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {facultades.map((f, i) => {
            const count = countBySlug.get(f.slug) ?? 0
            return (
              <Reveal key={f.slug} delay={i * 60}>
                <Link
                  href={`/facultades/${f.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
                >
                  {/* Carrera count badge */}
                  {count > 0 && (
                    <span className="mb-3 self-start rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 px-3 py-1 text-xs font-bold text-[#5CFF5C]">
                      {count} {count === 1 ? 'carrera' : 'carreras'}
                    </span>
                  )}

                  <h2 className="mb-2 text-lg font-semibold leading-snug text-white transition-colors group-hover:text-[#8AFF8A]">
                    {f.nombre}
                  </h2>

                  {f.descripcion && (
                    <p className="mb-3 line-clamp-3 flex-1 text-sm text-white/45">{f.descripcion}</p>
                  )}

                  {f.decano && (
                    <p className="mt-auto text-xs text-white/30">
                      <span className="font-semibold text-white/40">{t('decano')}:</span>{' '}
                      {f.decano}
                    </p>
                  )}

                  <p className="mt-3 text-xs font-semibold text-[#5CFF5C]/60 transition-colors group-hover:text-[#5CFF5C]">
                    {t('verCarreras')} →
                  </p>
                </Link>
              </Reveal>
            )
          })}
        </div>

      </div>
    </div>
  )
}
