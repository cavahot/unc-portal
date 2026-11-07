// INST-03: listado /noticias en el sistema visual del portal (cabecera compartida, lista de filas, aviso en línea).
// Las noticias salen del CMS (`getNews`). Estados: `ok`, `empty` (el CMS respondió sin noticias) y `unavailable` (el
// CMS no respondió). Antes ambos últimos se mostraban igual («No hay noticias»): una caída parecía una redacción sin
// novedades. Ahora «no disponible» ofrece «Intentar de nuevo» y los dos llevan a Contacto; nunca un modal.
// Una página fuera de rango (`?page=99`) da 404 en vez de «no hay noticias» (la persona sigue un enlace viejo, no hay
// una lista vacía). Un error inesperado de render lo recoge `error.tsx` de esta ruta.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import NewsList, { type NewsListItem } from '@/components/news/NewsList'
import NewsPagination from '@/components/news/NewsPagination'
import { getT, getF } from '@/lib/i18n/server'
import { getNews } from '@/lib/cms/queries/news'
import { CmsError } from '@/lib/cms/errors'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

const PAGE_SIZE = 6
const KNOWN_CATEGORIES = new Set(['institucional', 'academica', 'investigacion', 'extension', 'eventos', 'comunicados'])

/** Número de página pedido (`?page=`): entero ≥ 1; cualquier otro valor se trata como la primera. */
function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.noticias')
  const page = parsePage(sp.page)
  return {
    title: page > 1 ? t('pageTitlePaged', { title: t('pageTitle'), page }) : t('pageTitle'),
    description: t('pageDescription'),
  }
}

export default async function NoticiasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const page = parsePage(sp.page)
  const [t, format] = await Promise.all([getT(locale, 'pages.noticias'), getF(locale)])
  const prefix = locale === 'es' ? '' : `${locale}/`

  let docs: Awaited<ReturnType<typeof getNews>>['docs'] = []
  let totalPages = 1
  let totalDocs = 0
  let unavailable = false
  try {
    const res = await getNews({ page, limit: PAGE_SIZE })
    docs = res.docs ?? []
    totalPages = res.totalPages ?? 1
    totalDocs = res.totalDocs ?? 0
  } catch (error) {
    // Se registra el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS).
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[NOTICIAS] No se pudo leer el CMS (${detail}); se muestra el aviso de no disponible.`)
    unavailable = true
  }

  if (!unavailable && docs.length === 0 && page > 1 && totalDocs > 0) notFound()

  const items: NewsListItem[] = docs.map((n) => {
    const image = n.featuredImage?.url || n.featuredImageUrl || null
    return {
      id: n.id,
      slug: n.slug,
      title: n.title,
      summary: n.summary,
      imageUrl: image,
      imageAlt: n.featuredImage?.alt || null,
      blurDataURL: (n.featuredImage as { blurDataURL?: string } | null | undefined)?.blurDataURL ?? null,
      categoryText: n.category ? (KNOWN_CATEGORIES.has(n.category) ? t(`categories.${n.category}`) : n.category) : null,
      dateTime: n.publishedAt ?? null,
      dateText: n.publishedAt ? format.dateTime(new Date(n.publishedAt), { year: 'numeric', month: 'long', day: 'numeric' }) : null,
    }
  })

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('heading')}
        description={t('subheading')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {items.length > 0 ? (
            <>
              <p className="mb-6 text-sm font-semibold text-[#3E4A45]">{t('count', { count: totalDocs, page, total: totalPages })}</p>
              <NewsList items={items} lead={page === 1} label={t('listLabel')} />
              <NewsPagination
                current={page}
                total={totalPages}
                labels={{ nav: t('pagination.label'), prev: t('pagination.prev'), next: t('pagination.next'), page: (n) => t('pagination.page', { page: n }) }}
              />
            </>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(unavailable ? 'states.unavailable' : 'empty')}
              retry={unavailable ? { href: `/${prefix}noticias`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
