// INST-06: /biblioteca (repositorio de tesis) en el sistema visual del portal, con la búsqueda como acción principal.
// Los datos salen de la colección `tesis` del CMS (`getTesisCatalogo`). Estados: `ok`, `empty` (sin tesis, para la búsqueda o
// en todo el repositorio) y `unavailable` (el CMS no respondió): aviso en línea con una salida (reintentar solo si no
// respondió, y Contacto); nunca un modal. Antes una caída se mostraba como «sin resultados».
// Sin término de búsqueda se listan las tesis más recientes (antes la página quedaba vacía aunque hubiera tesis).
// El formulario conserva el idioma (antes su `action` era `/biblioteca` y al buscar se perdía el prefijo).
import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import TesisLista from '@/components/biblioteca/TesisLista'
import { getT } from '@/lib/i18n/server'
import { getTesisCatalogo } from '@/lib/cms/queries/tesisCatalogo'
import { MAX_QUERY_LENGTH, normalizeQuery } from '@/lib/cms/tesisCatalogo'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href pasa por la allowlist, aunque aquí se arme con el idioma

// La página depende de `?q=`, así que se renderiza por petición; las consultas conservan la etiqueta `tesis`.
const LIMIT = 12

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string | string[] }>
}): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.biblioteca')
  const q = normalizeQuery(sp.q)
  return { title: q ? t('pageTitleQuery', { q }) : t('pageTitleDefault'), description: t('pageDescription') }
}

export default async function BibliotecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.biblioteca')
  const prefix = locale === 'es' ? '' : `${locale}/`
  const q = normalizeQuery(sp.q)
  const result = await getTesisCatalogo({ q, limit: LIMIT })
  const here = `/${prefix}biblioteca`

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('headingDefault')}
        description={t('subheading')}
        aside={
          // Firma de la página: la búsqueda es la acción principal y vive en la cabecera.
          <form method="GET" action={here} role="search" className="print:hidden">
            <label htmlFor="biblioteca-q" className="mb-3 block text-sm font-semibold text-white/80">
              {t('searchLabel')}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="biblioteca-q"
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
          {result.status === 'ok' ? (
            <section aria-labelledby="biblioteca-resultados">
              {/* aria-live: al buscar sin recargar el foco, el resumen se anuncia. */}
              <h2 id="biblioteca-resultados" aria-live="polite" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                {q ? t('results.query', { count: result.total, q }) : t('results.recent')}
              </h2>
              {result.total > result.docs.length && (
                <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{t('results.partial', { shown: result.docs.length, total: result.total })}</p>
              )}
              <div className="mt-8">
                <TesisLista items={result.docs} labels={{ lista: t('results.listLabel'), ver: t('verTesis'), nuevaPestana: t('newTab') }} />
              </div>
              {q && (
                <p className="mt-8 print:hidden">
                  <Link href={safeHref(here)} className="rounded-sm text-sm font-bold text-[#004700] underline underline-offset-4 hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]">
                    {t('results.clear')}
                  </Link>
                </p>
              )}
            </section>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={result.status === 'unavailable' ? t('states.unavailable') : q ? t('states.noResults', { query: q }) : t('states.emptyLibrary')}
              retry={result.status === 'unavailable' ? { href: q ? `${here}?q=${encodeURIComponent(q)}` : here, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
