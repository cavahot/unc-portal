// INST-03: paginación de /noticias. Servidor, sin estado.
// Qué hace: enlaces «anterior», números de página y «siguiente» hacia `/noticias?page=N` (la primera página es
// `/noticias`, sin parámetro, para no duplicar la dirección). La página actual lleva `aria-current="page"`.
// Por qué se reescribió: antes usaba estilos en línea del tema oscuro, `href="#"` para los extremos (un enlace que no
// lleva a ningún lado y que los lectores de pantalla anuncian como activo) y textos fijos en español («Página anterior»).
// Aquí los extremos son texto inactivo (no enlace) y todos los textos llegan traducidos; cada control mide al menos
// 44 px (objetivo táctil). Límite: no valida que la página exista; eso lo decide la página que la usa.
import { Link } from '@/i18n/navigation'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href pasa por la allowlist, aunque aquí se arme con enteros

export interface NewsPaginationProps {
  current: number
  total: number
  labels: { nav: string; prev: string; next: string; page: (n: number) => string }
}

/** Páginas a mostrar: primera, última y una de margen alrededor de la actual; «…» donde se omiten. */
export function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  const pages: (number | '…')[] = [1]
  if (left > 2) pages.push('…')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push('…')
  pages.push(total)
  return pages
}

/** Dirección de una página de la lista (la primera, sin parámetro). */
export function pageHref(n: number): string {
  return n <= 1 ? '/noticias' : `/noticias?page=${n}`
}

const base =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const idle = `${base} border-2 border-[#004700]/30 text-[#004700] hover:border-[#004700]`
const here = `${base} bg-[#004700] text-white`
const off = 'inline-flex min-h-11 min-w-11 items-center justify-center px-4 text-sm font-bold text-[#6B7A73]'

export default function NewsPagination({ current, total, labels }: NewsPaginationProps) {
  if (total <= 1) return null
  return (
    <nav aria-label={labels.nav} className="mt-12 print:hidden">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {current > 1 ? (
            <Link href={safeHref(pageHref(current - 1))} rel="prev" className={idle}>
              <span aria-hidden="true">←&nbsp;</span>
              {labels.prev}
            </Link>
          ) : (
            <span aria-disabled="true" className={off}>
              <span aria-hidden="true">←&nbsp;</span>
              {labels.prev}
            </span>
          )}
        </li>
        {pageRange(current, total).map((p, i) => (
          <li key={`${p}-${i}`}>
            {p === '…' ? (
              <span aria-hidden="true" className="inline-flex min-h-11 items-center px-1 text-[#3E4A45]">
                …
              </span>
            ) : (
              <Link
                href={safeHref(pageHref(p))}
                aria-current={p === current ? 'page' : undefined}
                aria-label={labels.page(p)}
                className={p === current ? here : idle}
              >
                {p}
              </Link>
            )}
          </li>
        ))}
        <li>
          {current < total ? (
            <Link href={safeHref(pageHref(current + 1))} rel="next" className={idle}>
              {labels.next}
              <span aria-hidden="true">&nbsp;→</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={off}>
              {labels.next}
              <span aria-hidden="true">&nbsp;→</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
