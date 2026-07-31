import { getT } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import { getCarreras, type CarreraPopulada } from '@/lib/cms/queries/carreras'
import Reveal from '@/components/motion/Reveal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.carreras')
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  }
}

export default async function CarrerasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.carreras')

  const carreras = await getCarreras()

  // Group by facultad
  const grouped = new Map<string, { nombre: string; slug: string; items: CarreraPopulada[] }>()
  for (const c of carreras) {
    const slug = c.facultad?.slug ?? 'sin-facultad'
    const nombre = c.facultad?.nombre ?? 'Sin facultad'
    if (!grouped.has(slug)) {
      grouped.set(slug, { nombre, slug, items: [] })
    }
    grouped.get(slug)!.items.push(c)
  }

  const grupos = Array.from(grouped.values())

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
        {grupos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-white/40">{t('empty')}</p>
          </div>
        )}

        {/* Grouped sections */}
        <div className="space-y-14">
          {grupos.map((grupo, gi) => (
            <Reveal key={grupo.slug} delay={gi * 80}>
              <section>
                {/* Faculty header */}
                <div className="mb-5 flex flex-wrap items-center gap-4">
                  <h2 className="text-xl font-bold text-white">{grupo.nombre}</h2>
                  <Link
                    href={`/facultades/${grupo.slug}`}
                    className="text-xs font-semibold text-[#5CFF5C] transition-colors hover:text-[#8AFF8A]"
                  >
                    {t('verFacultad')} →
                  </Link>
                </div>

                {/* Carreras grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grupo.items.map((c, ci) => (
                    <Reveal key={c.slug} delay={gi * 80 + ci * 40}>
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
                            <span className="rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 px-3 py-1 text-xs text-[#5CFF5C]/70">
                              {c.modalidad}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-xs font-semibold text-[#5CFF5C]/60 transition-colors group-hover:text-[#5CFF5C]">
                          {t('verDetalle')} →
                        </p>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
