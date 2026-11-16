// INST-03: lista de noticias de /noticias (spec: este rediseño; patrón de HubSecciones, ver docs del portal).
// Qué hace: una sola lista de filas donde cada fila es UN enlace (imagen, titular, resumen, categoría y fecha). En la
// primera página la primera noticia es la destacada: imagen grande a un lado y titular más grande. Sin tarjetas iguales
// en cuadrícula ni etiquetas en mayúsculas sobre el titular (reglas de diseño del portal): la categoría y la fecha van
// en una línea de datos bajo el resumen.
// Por qué una lista y no una cuadrícula: las noticias se leen de arriba abajo en orden cronológico; la lista da un solo
// recorrido con el teclado (un enlace por fila, foco visible) y deja que el titular, que es lo que se escanea, sea largo.
// Límite: no consulta el CMS ni traduce; recibe los textos y las URL de imagen ya validadas por `normalizeNewsMedia`.
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { UNC_BLUR } from '@/lib/imagePlaceholder'

export interface NewsListItem {
  id: number | string
  slug: string
  title: string
  summary?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  blurDataURL?: string | null
  /** Fecha ISO para el elemento `<time>`; si falta, la fecha va como texto. */
  dateTime?: string | null
  /** Fecha ya formateada en el idioma de la persona («24 de julio de 2026»). */
  dateText?: string | null
  /** Categoría ya traducida (o el valor del CMS si no está en el catálogo). */
  categoryText?: string | null
}

export interface NewsListProps {
  items: NewsListItem[]
  /** Si es true, la primera noticia se muestra como destacada (solo en la primera página). */
  lead: boolean
  label: string
}

const focus =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[#00A300]'

/** Línea de datos: categoría y fecha (esta última en `<time>` para lectores de pantalla y buscadores). */
function Meta({ item }: { item: NewsListItem }) {
  if (!item.categoryText && !item.dateText) return null
  return (
    <p className="mt-3 text-sm font-semibold text-[#004700]">
      {item.categoryText}
      {item.categoryText && item.dateText && <span aria-hidden="true"> · </span>}
      {item.dateText && (item.dateTime ? <time dateTime={item.dateTime}>{item.dateText}</time> : item.dateText)}
    </p>
  )
}

function Thumb({ item, sizes, priority, className }: { item: NewsListItem; sizes: string; priority: boolean; className: string }) {
  if (!item.imageUrl) return null
  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#E3EDE7] ${className}`}>
      <Image
        src={item.imageUrl}
        // La imagen ya es el contenido del enlace: el texto alternativo describe la foto, no repite el titular.
        alt={item.imageAlt ?? ''}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        placeholder="blur"
        blurDataURL={item.blurDataURL ?? UNC_BLUR}
        priority={priority}
      />
    </div>
  )
}

export default function NewsList({ items, lead, label }: NewsListProps) {
  return (
    <ul aria-label={label} className="divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
      {items.map((item, i) => {
        const isLead = lead && i === 0
        return (
          <li key={item.id}>
            <Link
              href={`/noticias/${encodeURIComponent(item.slug)}`}
              className={`group grid gap-x-8 gap-y-5 px-6 py-6 transition-colors hover:bg-[#F4F7F5] motion-reduce:transition-none sm:px-8 ${focus} ${
                item.imageUrl ? (isLead ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:py-8' : 'sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-start') : ''
              }`}
            >
              <Thumb
                item={item}
                priority={isLead}
                sizes={isLead ? '(max-width: 1024px) 100vw, 55vw' : '(max-width: 640px) 100vw, 208px'}
                className={isLead ? 'aspect-[16/10]' : 'aspect-[4/3]'}
              />
              <div>
                <h2
                  className={`text-balance font-serif font-bold tracking-[-0.02em] text-[#09231D] group-hover:text-[#004700] ${
                    isLead ? 'text-3xl leading-[1.1] sm:text-4xl' : 'text-xl leading-snug sm:text-2xl'
                  }`}
                >
                  {item.title}
                </h2>
                {item.summary && (
                  <p className={`mt-3 max-w-[65ch] text-base leading-7 text-[#3E4A45] ${isLead ? 'line-clamp-4' : 'line-clamp-2'}`}>{item.summary}</p>
                )}
                <Meta item={item} />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
