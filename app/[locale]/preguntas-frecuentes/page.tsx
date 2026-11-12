// Preguntas frecuentes en el sistema visual del portal (cabecera verde común, fondo claro, avisos en línea).
// Las preguntas y respuestas vienen del CMS (colección `faqs`) y son la ÚNICA fuente: si el CMS está vacío o caído se muestra
// un aviso en línea con una salida, nunca preguntas escritas en el código. Los textos de la página (cabecera, búsqueda,
// categorías, contacto) salen del catálogo `pages.preguntas-frecuentes`, así que /en, /pt-BR y /gn no muestran español.
// Límite: las preguntas y respuestas del CMS hoy existen solo en español; el aspecto visual se verifica en el navegador.
import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import FAQAccordion from '@/components/faq/FAQAccordion'
import { FAQ_CATEGORIES, getFAQsResult } from '@/lib/cms/queries/faqs'
import { getT } from '@/lib/i18n/server'

// ISR: revalida cada 60 s para no hornear el aviso de «no disponible» si el build corre sin CMS alcanzable.
// Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas de revalidación lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.preguntas-frecuentes')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function PreguntasFrecuentesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.preguntas-frecuentes')
  const prefix = locale === 'es' ? '' : `${locale}/`
  const result = await getFAQsResult()
  const items = result.status === 'ok' ? result.data : []

  const categories = FAQ_CATEGORIES.map((c) => ({ value: c.value, icon: c.icon, label: t(`categories.${c.value}`) }))
  // El acordeón es un componente de cliente y no recibe funciones: los textos con valores viajan con marcadores literales
  // {query} y {count} que el cliente sustituye (el valor pasado a t() no se vuelve a interpretar como ICU).
  const tokens = { query: '{query}', count: '{count}' }

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={t('hero.description')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem]">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' ? (
            <>
              {/* Resumen por categoría — solo escritorio */}
              <nav aria-label={t('nav.label')} className="mb-10 hidden gap-3 sm:flex sm:flex-wrap">
                {categories.map((cat) => {
                  const count = items.filter((i) => i.category === cat.value).length
                  if (count === 0) return null
                  return (
                    <div
                      key={cat.value}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#3A4A42] shadow-sm ring-1 ring-[#D7E0DB]"
                    >
                      <span aria-hidden>{cat.icon}</span>
                      {cat.label}
                      <span className="ml-0.5 rounded-full bg-[#E6FFE6] px-1.5 py-0.5 text-[0.65rem] font-extrabold text-[#004700]">{count}</span>
                    </div>
                  )
                })}
              </nav>

              <FAQAccordion
                items={items}
                categories={categories}
                labels={{
                  searchLabel: t('search.label'),
                  searchPlaceholder: t('search.placeholder'),
                  clear: t('search.clear'),
                  filter: t('search.filter'),
                  all: t('search.all'),
                  none: t('results.none', tokens),
                  noneHint: t('results.noneHint'),
                  showAll: t('results.showAll'),
                  countOne: t('results.countOne', tokens),
                  countOther: t('results.countOther', tokens),
                  questionsOne: t('results.questionsOne', tokens),
                  questionsOther: t('results.questionsOther', tokens),
                }}
              />
            </>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}preguntas-frecuentes`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}

          {/* Cierre: salida a Contacto */}
          <div className="mt-16 overflow-hidden rounded-3xl bg-[#004700] px-8 py-10 text-white print:hidden">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#B8FFB8]">{t('cta.kicker')}</p>
                <h2 className="mt-1 font-serif text-xl font-bold leading-snug">{t('cta.title')}</h2>
                <p className="mt-1 text-sm text-white/80">{t('cta.body')}</p>
              </div>
              <Link
                href={`/${prefix}contacto`}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t('cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
