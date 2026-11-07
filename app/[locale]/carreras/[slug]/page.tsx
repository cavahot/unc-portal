// INST-04: detalle de carrera en el sistema visual del portal (cabecera compartida con la ficha del programa, resoluciones
// del CONES, descripción y perfil si existen, enlace a la facultad y regreso al catálogo).
// Qué muestra: solo lo que el CMS tiene. La página anterior mostraba duración, título y modalidad (presentes en 7, 8 y 12
// de las 62 carreras) e ignoraba tipo, sede y resoluciones (presentes en todas): ahora son la base de la ficha y de la
// sección de resoluciones. Nunca se completa un dato que falta ni se escribe uno en el código.
// Errores: `getCarreraBySlug` devuelve `null` si no existe (404) y propaga la caída del CMS a `error.tsx` en lugar de
// cachear un 404 (DEP-15). Los enlaces de resolución se validan con host exacto (`mapResoluciones`).
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PageHero from '@/components/pages/PageHero'
import { getT } from '@/lib/i18n/server'
import { getCarreraBySlug } from '@/lib/cms/queries/carreras'
import { mapCarreraCatalogo } from '@/lib/cms/carrerasCatalogo'
import { rutaFacultad } from '@/lib/cms/facultadRutas'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15
import { buildCourseSchema, buildBreadcrumbSchema, safeJsonLd } from '@/lib/seo/jsonld'

// DEP-15: no consulta el CMS en el build, por lo que no puede lanzar; las carreras se generan bajo demanda.
// ISR (R4): revalida la página cada 60 s. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  const carrera = mapCarreraCatalogo(await getCarreraBySlug(slug).catch(() => null))
  if (!carrera) {
    const t = await getT(locale, 'pages.carreras')
    return { title: t('empty') }
  }
  return {
    title: `${carrera.nombre} | UNC`,
    description: carrera.descripcion ?? ([carrera.titulo, carrera.facultad?.nombre].filter(Boolean).join(' — ') || undefined),
  }
}

export default async function CarreraDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const t = await getT(locale, 'pages.carreras')
  const prefix = locale === 'es' ? '' : `${locale}/`
  const homeHref = `/${locale === 'es' ? '' : locale}`

  // DEP-15: sin `.catch`; null = no existe (404), CmsError = CMS caído (no se cachea como 404).
  const carrera = mapCarreraCatalogo(await getCarreraBySlug(slug))
  if (!carrera) notFound()

  // Ficha del programa: solo las filas con dato.
  const ficha = [
    carrera.tipo && { term: t('detalle.tipo'), value: t(`tipos.${carrera.tipo}`) },
    carrera.sede && { term: t('sede'), value: carrera.sede },
    carrera.modalidad && { term: t('modalidad'), value: carrera.modalidad },
    carrera.duracion && { term: t('detalle.duracion'), value: t('duracion', { count: carrera.duracion }) },
    carrera.titulo && { term: t('titulo'), value: carrera.titulo },
  ].filter(Boolean) as Array<{ term: string; value: string }>

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.unc.edu.py'
  const courseSchema = buildCourseSchema({
    name: carrera.nombre,
    description: carrera.descripcion ?? null,
    slug,
    provider: carrera.facultad?.nombre ?? null,
    duration: carrera.duracion ? `P${carrera.duracion}Y` : null,
    mode: carrera.modalidad ?? null,
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t('breadcrumb.inicio'), url: SITE_URL },
    { name: t('breadcrumb.nombre'), url: `${SITE_URL}/carreras` },
    { name: carrera.nombre, url: `${SITE_URL}/carreras/${slug}` },
  ])

  const sections = [carrera.resoluciones.length > 0, Boolean(carrera.descripcion), Boolean(carrera.perfil)].filter(Boolean).length

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      <PageHero
        homeHref={homeHref}
        homeLabel={t('breadcrumb.inicio')}
        parent={{ href: `${homeHref === '/' ? '' : homeHref}/carreras`, label: t('breadcrumb.nombre') }}
        pageName={carrera.nombre}
        title={carrera.nombre}
        titleSize="md"
        description={carrera.descripcion ?? null}
        note={carrera.facultad?.nombre ?? null}
        aside={
          ficha.length > 0 && (
            <section aria-labelledby="ficha-programa" className="rounded-2xl bg-white/[0.09] p-6 sm:p-8">
              <h2 id="ficha-programa" className="text-sm font-semibold text-white/80">
                {t('detalle.fichaLabel')}
              </h2>
              <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {ficha.map((f) => (
                  <div key={f.term}>
                    <dt className="text-sm text-white/75">{f.term}</dt>
                    <dd className="mt-0.5 text-lg font-semibold leading-snug text-white">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        }
      />

      <article className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-16">
            {carrera.resoluciones.length > 0 && (
              <section aria-labelledby="resoluciones">
                <h2 id="resoluciones" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                  {t('detalle.resoluciones.title')}
                </h2>
                <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{t('detalle.resoluciones.intro')}</p>
                <ul className="mt-8 flex flex-wrap gap-3">
                  {carrera.resoluciones.map((r) => (
                    <li key={r.numero}>
                      {r.href ? (
                        <a
                          href={safeHref(r.href)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${t('detalle.resoluciones.open', { numero: r.numero })}${r.detalle ? `, ${r.detalle}` : ''}`}
                          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#E3F3E6] px-5 font-serif text-xl font-bold tabular-nums text-[#004700] transition-colors hover:bg-[#004700] hover:text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300] motion-reduce:transition-none"
                        >
                          {r.numero}
                          {r.detalle && <span className="font-sans text-sm font-semibold">{r.detalle}</span>}
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M7 17 17 7M9 7h8v8" />
                          </svg>
                        </a>
                      ) : (
                        <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 font-serif text-xl font-bold tabular-nums text-[#004700]">
                          {r.numero}
                          {r.detalle && <span className="font-sans text-sm font-semibold">{r.detalle}</span>}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {carrera.perfil && (
              <section aria-labelledby="perfil">
                <h2 id="perfil" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                  {t('detalle.perfil')}
                </h2>
                <p className="mt-4 max-w-[65ch] text-lg leading-8 text-[#1F2D27]">{carrera.perfil}</p>
              </section>
            )}

            {carrera.facultad && (
              <aside aria-labelledby="facultad-carrera" className="rounded-2xl bg-[#004700] p-8 text-white sm:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
                <div>
                  <h2 id="facultad-carrera" className="font-serif text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                    {carrera.facultad.nombre}
                  </h2>
                  <p className="mt-3 max-w-[65ch] text-base leading-7 text-white/85">{t('detalle.facultadTexto')}</p>
                </div>
                <Link
                  href={safeHref(`/${prefix}${rutaFacultad(carrera.facultad.slug).replace(/^\//, '')}`)}
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white lg:mt-0"
                >
                  {t('verFacultad')}
                </Link>
              </aside>
            )}

            <div className={`print:hidden ${sections > 0 || carrera.facultad ? 'border-t border-[#D7E0DB] pt-8' : ''}`}>
              <Link
                href={safeHref(`/${prefix}carreras`)}
                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
              >
                <span aria-hidden="true">←&nbsp;</span>
                {t('backToCarreras')}
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
