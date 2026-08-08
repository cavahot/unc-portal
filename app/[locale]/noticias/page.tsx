import Image from 'next/image'
import { getT, getF } from '@/lib/i18n/server'
import { Link } from '@/i18n/navigation'
import { getNews } from '@/lib/cms/queries/news'
import { UNC_BLUR } from '@/lib/imagePlaceholder'

const PAGE_SIZE = 6

type CategoryKey = 'institucional' | 'academica' | 'investigacion' | 'extension' | 'eventos' | 'comunicados'
const KNOWN_CATEGORIES = new Set<string>(['institucional', 'academica', 'investigacion', 'extension', 'eventos', 'comunicados'])

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const t = await getT(locale, 'pages.noticias')
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  return {
    title: page > 1 ? `${t('pageTitle')} — Pág. ${page}` : t('pageTitle'),
    description: t('pageDescription'),
  }
}

// ─── Pagination controls ──────────────────────────────────────────────────────

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const delta = 1
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  const pages: (number | '…')[] = [1]
  if (left > 2) pages.push('…')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push('…')
  pages.push(total)
  return pages
}

function Pagination({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null

  const pages = pageRange(current, total)

  const linkStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2.25rem',
    height: '2.25rem',
    padding: '0 0.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: active ? 700 : 500,
    textDecoration: 'none',
    border: '1px solid',
    borderColor: active ? '#5CFF5C' : 'rgba(255,255,255,0.1)',
    backgroundColor: active ? 'rgba(92,255,92,0.1)' : 'transparent',
    color: active ? '#5CFF5C' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)',
    pointerEvents: disabled ? 'none' : 'auto',
    transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
  })

  return (
    <nav
      aria-label="Paginación de noticias"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.375rem',
        marginTop: '3rem',
        flexWrap: 'wrap',
      }}
    >
      <Link
        href={current > 1 ? `?page=${current - 1}` : '#'}
        aria-disabled={current === 1}
        style={linkStyle(false, current === 1)}
        aria-label="Página anterior"
      >
        ←
      </Link>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} style={{ color: 'rgba(255,255,255,0.25)', padding: '0 0.25rem' }}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={`?page=${p}`}
            aria-current={p === current ? 'page' : undefined}
            style={linkStyle(p === current)}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={current < total ? `?page=${current + 1}` : '#'}
        aria-disabled={current === total}
        style={linkStyle(false, current === total)}
        aria-label="Página siguiente"
      >
        →
      </Link>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NoticiasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const [t, format] = await Promise.all([
    getT(locale, 'pages.noticias'),
    getF(locale),
  ])

  let noticias: Awaited<ReturnType<typeof getNews>>['docs'] = []
  let totalPages = 1
  let totalDocs = 0

  try {
    const res = await getNews({ page, limit: PAGE_SIZE })
    noticias = res.docs ?? []
    totalPages = res.totalPages ?? 1
    totalDocs = res.totalDocs ?? 0
  } catch {
    // CMS unavailable — empty state
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('portalLabel')}</p>
            <h1 className="text-4xl font-bold text-white">{t('heading')}</h1>
            <p className="mt-2 text-white/50">{t('subheading')}</p>
          </div>
          {totalDocs > 0 && (
            <p className="text-sm text-white/30">
              {totalDocs} {totalDocs === 1 ? 'noticia' : 'noticias'} · pág. {page} de {totalPages}
            </p>
          )}
        </div>

        {noticias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6" />
              </svg>
            </div>
            <p className="text-white/40">{t('empty')}</p>
          </div>
        ) : (
          <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {noticias.map((n, i) => (
              <Link
                key={n.id}
                href={`/noticias/${n.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.07] hover:shadow-[0_8px_32px_-12px_rgba(0,200,0,0.18)]"
              >
                {(n.featuredImage?.url || n.featuredImageUrl) ? (
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={n.featuredImage?.url || n.featuredImageUrl!}
                      alt={n.featuredImage?.alt || n.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL={(n.featuredImage as any)?.blurDataURL ?? UNC_BLUR}
                      priority={i < 3}
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-[#004700]/30">
                    <svg className="h-12 w-12 text-[#5CFF5C]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6" />
                    </svg>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  {n.category && (
                    <span className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#5CFF5C]">
                      {KNOWN_CATEGORIES.has(n.category)
                        ? t(`categories.${n.category as CategoryKey}`)
                        : n.category}
                    </span>
                  )}
                  <h2 className="mb-2 line-clamp-3 text-[0.95rem] font-semibold leading-snug text-white transition-colors group-hover:text-[#8AFF8A]">
                    {n.title}
                  </h2>
                  {n.summary && (
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-white/45">{n.summary}</p>
                  )}
                  {n.publishedAt && (
                    <p className="mt-4 text-xs text-white/30">
                      {format.dateTime(new Date(n.publishedAt), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <Pagination current={page} total={totalPages} />
          </>
        )}
      </div>
    </div>
  )
}
