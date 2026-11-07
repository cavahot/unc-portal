// INST-05: /tramites en el sistema visual del portal, con el contenido en el CMS (colección `tramites`).
// Spec: docs/specs/portal/TRAMITES.md §2.6. Antes los requisitos de las seis facultades estaban escritos en un componente
// de cliente con pestañas; ahora salen de `getTramites()` y se muestran todos, agrupados por facultad.
// Estados: `ok`, `empty` (el CMS respondió sin trámites activos) y `unavailable` (el CMS no respondió): aviso en línea
// con una salida (reintentar solo si no respondió, y Contacto); nunca requisitos escritos en el código ni un modal.
// Firma de la página: un índice de facultades en la cabecera (anclas), igual que /carreras.
import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import TramitesPorFacultad from '@/components/tramites/TramitesPorFacultad'
import { getT } from '@/lib/i18n/server'
import { getTramites } from '@/lib/cms/queries/tramites'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.tramites')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function TramitesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.tramites'), getTramites()])
  const prefix = locale === 'es' ? '' : `${locale}/`
  const grupos = result.status === 'ok' ? result.grupos : []

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={t('hero.description')}
        aside={
          grupos.length > 1 && (
            <nav aria-labelledby="tramites-index" className="print:hidden">
              <p id="tramites-index" className="mb-3 text-sm font-semibold text-white/80">
                {t('index.label')}
              </p>
              <ul className="flex flex-col gap-2">
                {grupos.map((g) => (
                  <li key={g.facultad.slug}>
                    <a
                      href={`#fac-${g.facultad.slug}`}
                      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl bg-white/[0.09] px-5 py-3 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                    >
                      <span className="text-base font-semibold text-white group-hover:text-[#004700]">{g.facultad.nombre}</span>
                      <span className="text-sm tabular-nums text-white/75 group-hover:text-[#004700]/75">{g.tramites.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )
        }
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' ? (
            <div className="flex flex-col gap-16">
              <TramitesPorFacultad
                grupos={grupos}
                labels={{ requisitos: t('requisitos'), nota: t('nota'), listaDe: (facultad) => t('listaDe', { facultad }) }}
              />
              <aside aria-labelledby="tramites-ayuda" className="rounded-2xl bg-[#004700] p-8 text-white sm:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 print:hidden">
                <div>
                  <h2 id="tramites-ayuda" className="font-serif text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                    {t('help.title')}
                  </h2>
                  <p className="mt-3 max-w-[65ch] text-base leading-7 text-white/85">{t('help.description')}</p>
                </div>
                <Link
                  href={`/${prefix}contacto`}
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white lg:mt-0"
                >
                  {t('help.action')}
                </Link>
              </aside>
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}tramites`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
