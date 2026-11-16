// INST-10: /buscar en el sistema visual del portal, con la búsqueda como acción principal y estados por fuente.
// Busca en dos fuentes del CMS: noticias (`getNewsByQuery`) y tesis (`getTesisCatalogo`). Cada fuente tiene su estado
// (`ok`, `empty` o `unavailable`): antes una caída de una fuente se mostraba como «sin resultados», o la búsqueda caía a
// la pantalla de error global. Ahora: con las dos caídas, «no disponible» con reintentar; si cae una, se muestran los
// resultados de la otra con un aviso en línea; si ninguna tiene resultados, «sin resultados» con salidas útiles. Nunca un modal.
// Sin término se listan las noticias más recientes (como antes) y no se consultan las tesis.
// El término se normaliza (recortado, sin espacios repetidos, hasta 100 caracteres) antes de llegar al CMS, y el formulario
// conserva el idioma (antes su `action` era `/buscar` y al buscar se perdía el prefijo).
import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import NewsList from '@/components/news/NewsList'
import TesisLista from '@/components/biblioteca/TesisLista'
import { getT, getF } from '@/lib/i18n/server'
import { getNews, getNewsByQuery } from '@/lib/cms/queries/news'
import { getTesisCatalogo, type TesisCatalogoResult } from '@/lib/cms/queries/tesisCatalogo'
import { MAX_QUERY_LENGTH, normalizeQuery } from '@/lib/cms/tesisCatalogo'
import { toNewsListItem } from '@/lib/cms/newsListItem'
import { CmsError } from '@/lib/cms/errors'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href pasa por la allowlist, aunque aquí se arme con el idioma

// La página depende de `?q=`, así que se renderiza por petición; las consultas conservan sus etiquetas.
const LIMIT = 12
const enlace =
  'rounded-sm text-sm font-bold text-[#004700] underline underline-offset-4 hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const KNOWN_CATEGORIES = new Set(['institucional', 'academica', 'investigacion', 'extension', 'eventos', 'comunicados'])

/** Aviso en línea de una fuente caída cuando la otra sí tiene resultados (no sustituye a los resultados). */
function AvisoFuente({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-2xl border border-[#D7E0DB] bg-white px-6 py-4 text-base leading-7 text-[#3E4A45]">
      {message}
    </p>
  )
}

type NewsResult = { status: 'ok'; docs: Awaited<ReturnType<typeof getNews>>['docs']; total: number } | { status: 'empty' } | { status: 'unavailable' }

/** Noticias de la búsqueda (o las más recientes sin término); nunca lanza: una caída es `unavailable`, no «sin resultados». */
async function leerNoticias(q: string): Promise<NewsResult> {
  try {
    const res = q ? await getNewsByQuery(q, { limit: LIMIT }) : await getNews({ limit: LIMIT })
    const docs = res.docs ?? []
    if (docs.length === 0) return { status: 'empty' }
    return { status: 'ok', docs, total: typeof res.totalDocs === 'number' && res.totalDocs >= docs.length ? res.totalDocs : docs.length }
  } catch (error) {
    // Se registra el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS).
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[BUSCAR] No se pudo leer las noticias del CMS (${detail}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string | string[] }>
}): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.buscar')
  const q = normalizeQuery(sp.q)
  return { title: q ? t('pageTitleQuery', { q }) : t('pageTitleDefault'), description: t('pageDescription') }
}

export default async function BuscarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const [t, tn, format] = await Promise.all([getT(locale, 'pages.buscar'), getT(locale, 'pages.noticias'), getF(locale)])
  const prefix = locale === 'es' ? '' : `${locale}/`
  const q = normalizeQuery(sp.q)
  const here = `/${prefix}buscar`

  const [noticias, tesis]: [NewsResult, TesisCatalogoResult | null] = await Promise.all([
    leerNoticias(q),
    q ? getTesisCatalogo({ q, limit: LIMIT }) : Promise.resolve(null),
  ])

  const items =
    noticias.status === 'ok'
      ? noticias.docs.map((n) =>
          toNewsListItem(n, {
            categoryText: n.category ? (KNOWN_CATEGORIES.has(n.category) ? tn(`categories.${n.category}`) : n.category) : null,
            dateText: n.publishedAt ? format.dateTime(new Date(n.publishedAt), { year: 'numeric', month: 'long', day: 'numeric' }) : null,
          }),
        )
      : []
  const nTesis = tesis?.status === 'ok' ? tesis.total : 0
  const nNoticias = noticias.status === 'ok' ? noticias.total : 0
  const noticiasCaidas = noticias.status === 'unavailable'
  const tesisCaidas = tesis?.status === 'unavailable'
  const todoCaido = noticiasCaidas && (!q || tesisCaidas)
  // Sin resultados solo si ninguna fuente tiene resultados y ninguna cayó (una caída no es «sin resultados»).
  const sinResultados = noticias.status === 'empty' && (!q || tesis?.status === 'empty')
  const retryHref = q ? `${here}?q=${encodeURIComponent(q)}` : here

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('heading')}
        description={t('subheading')}
        aside={
          // Firma de la página: la búsqueda es la acción principal y vive en la cabecera.
          <form method="GET" action={here} role="search" className="print:hidden">
            <label htmlFor="buscar-q" className="mb-3 block text-sm font-semibold text-white/80">
              {t('searchLabel')}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="buscar-q"
                type="search"
                name="q"
                defaultValue={q}
                maxLength={MAX_QUERY_LENGTH}
                placeholder={t('searchPlaceholder')}
                className="min-h-12 flex-1 rounded-full border-2 border-transparent bg-white px-6 text-base text-[#09231D] placeholder:text-[#3E4A45]/70 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A]"
              />
              <button
                type="submit"
                className="min-h-12 rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                {t('searchButton')}
              </button>
            </div>
          </form>
        }
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {todoCaido ? (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t('states.unavailable')}
              retry={{ href: retryHref, label: t('states.retry') }}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          ) : sinResultados ? (
            <>
              <StatePanel
                message={q ? `${t('states.noResults', { query: q })} ${t('states.noResultsHint')}` : t('states.empty')}
                contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
              />
              {q && (
                <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 print:hidden">
                  <Link href={safeHref(`/${prefix}noticias`)} className={enlace}>
                    {t('links.news')}
                  </Link>
                  <Link href={safeHref(`/${prefix}biblioteca`)} className={enlace}>
                    {t('links.library')}
                  </Link>
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-14">
              {/* aria-live: al buscar sin recargar el foco, el resumen se anuncia. */}
              <h2 aria-live="polite" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                {q ? t('results.query', { count: nNoticias + nTesis, q }) : t('results.latest')}
              </h2>

              {noticiasCaidas && <AvisoFuente message={t('states.newsUnavailable')} />}
              {items.length > 0 && (
                <section aria-labelledby="buscar-noticias">
                  {q && (
                    <h3 id="buscar-noticias" className="mb-6 text-xl font-semibold text-[#09231D]">
                      {t('sections.news')} <span className="font-normal text-[#3E4A45]">({nNoticias})</span>
                    </h3>
                  )}
                  <NewsList items={items} lead={false} label={t('lists.news')} />
                </section>
              )}

              {q && tesisCaidas && <AvisoFuente message={t('states.tesisUnavailable')} />}
              {q && tesis?.status === 'ok' && (
                <section aria-labelledby="buscar-tesis">
                  <h3 id="buscar-tesis" className="mb-6 text-xl font-semibold text-[#09231D]">
                    {t('sections.tesis')} <span className="font-normal text-[#3E4A45]">({nTesis})</span>
                  </h3>
                  <TesisLista items={tesis.docs} labels={{ lista: t('lists.tesis'), ver: t('verTesis'), nuevaPestana: t('newTab') }} />
                </section>
              )}

              {q && (
                <p className="flex flex-wrap gap-x-6 gap-y-2 print:hidden">
                  <Link href={safeHref(here)} className={enlace}>
                    {t('links.clear')}
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
