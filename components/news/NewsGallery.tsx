'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { UNC_BLUR } from '@/lib/imagePlaceholder'

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface GalleryImage {
  url: string
  alt?: string | null
  caption?: string | null
  blurDataURL?: string | null
}

interface NewsGalleryProps {
  images: GalleryImage[]
  title?: string
}

/* ─── Lightbox ───────────────────────────────────────────────────────────────── */

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
  title,
}: {
  images: GalleryImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  title?: string
}) {
  const current = images[index]
  const total = images.length
  const [dragStart, setDragStart] = useState<number | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => setDragStart(e.clientX)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart === null) return
    const delta = e.clientX - dragStart
    if (Math.abs(delta) > 50) delta < 0 ? onNext() : onPrev()
    setDragStart(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Galería: ${title}` : 'Galería de imágenes'}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 left-4 text-white/50 text-sm font-mono select-none">
        {index + 1} / {total}
      </div>

      <button
        type="button"
        aria-label="Cerrar galería"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {total > 1 && (
        <button type="button" aria-label="Imagen anterior"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70 sm:left-6"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        className="relative flex max-h-[80vh] max-w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <Image
          key={`lightbox-${index}`}
          src={current.url}
          alt={current.alt ?? ''}
          width={1600}
          height={900}
          className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          style={{ objectFit: 'contain' }}
          placeholder="blur"
          blurDataURL={current.blurDataURL ?? UNC_BLUR}
          priority
        />
      </div>

      {current.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[80vw] text-center text-sm text-white/70 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {current.caption}
        </p>
      )}

      {total > 1 && (
        <button type="button" aria-label="Siguiente imagen"
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70 sm:right-6"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

/* ─── Coverflow card transform helper ───────────────────────────────────────── */

function cardStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset)
  // Hide cards beyond ±2
  if (abs > 2) return { opacity: 0, pointerEvents: 'none', zIndex: 0 }

  const sign = offset < 0 ? -1 : offset > 0 ? 1 : 0

  // Scale: center=1, ±1=0.80, ±2=0.62
  const scale = abs === 0 ? 1 : abs === 1 ? 0.80 : 0.62
  // Horizontal shift: ±1 ≈ 52%, ±2 ≈ 88%
  const tx = abs === 0 ? 0 : abs === 1 ? sign * 52 : sign * 88
  // Subtle Y rotation for the coverflow feel
  const ry = abs === 0 ? 0 : abs === 1 ? sign * 12 : sign * 20
  // Opacity: center=1, ±1=0.88, ±2=0.55
  const opacity = abs === 0 ? 1 : abs === 1 ? 0.88 : 0.55
  // Z-index: center highest
  const zIndex = abs === 0 ? 20 : abs === 1 ? 10 : 4

  return {
    transform: `perspective(900px) translateX(${tx}%) rotateY(${ry}deg) scale(${scale})`,
    opacity,
    zIndex,
    pointerEvents: abs > 1 ? 'none' : 'auto',
  }
}

/* ─── Coverflow carousel ─────────────────────────────────────────────────────── */

function CoverflowCarousel({
  images,
  title,
  onOpen,
}: {
  images: GalleryImage[]
  title?: string
  onOpen: (i: number) => void
}) {
  const [active, setActive] = useState(0)
  const current = images[active]

  const prev = useCallback(() => setActive((a) => (a - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setActive((a) => (a + 1) % images.length), [images.length])

  const handleCardClick = (i: number) => {
    if (i === active) {
      onOpen(i)
    } else {
      setActive(i)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }

  return (
    <div className="w-full" onKeyDown={handleKeyDown}>
      {/* ── Track ── */}
      <div
        className="relative mx-auto overflow-hidden"
        style={{ height: 'clamp(180px, 38vw, 340px)' }}
        aria-label="Galería de fotos"
        role="region"
      >
        {images.map((img, i) => {
          const offset = i - active
          const style = cardStyle(offset)
          const isCurrent = i === active

          return (
            <button
              key={i}
              type="button"
              aria-label={img.alt ?? `Foto ${i + 1} de ${images.length}`}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => handleCardClick(i)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '60%',
                left: '20%',           // centered base position
                transition: 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.45s ease',
                borderRadius: '1rem',
                overflow: 'hidden',
                cursor: isCurrent ? 'zoom-in' : 'pointer',
                ...style,
              }}
            >
              <Image
                src={img.url}
                alt={img.alt ?? ''}
                fill
                sizes="(max-width: 768px) 70vw, 500px"
                className="object-cover"
                placeholder="blur"
                blurDataURL={img.blurDataURL ?? UNC_BLUR}
                priority={isCurrent}
              />

              {/* Bottom gradient + caption on center card */}
              {isCurrent && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none">
                  <div className="absolute bottom-0 inset-x-0 p-4">
                    {img.caption && (
                      <p className="text-xs font-medium text-white/90 line-clamp-2 leading-snug">
                        {img.caption}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Zoom hint on center card */}
              {isCurrent && (
                <div className="absolute top-2.5 right-2.5 rounded-full bg-black/50 p-1.5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}

        {/* ── Prev / Next ── */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/8 backdrop-blur-sm border border-white/10 p-2 text-white/70 transition-all hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70 sm:p-2.5"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Siguiente foto"
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/8 backdrop-blur-sm border border-white/10 p-2 text-white/70 transition-all hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70 sm:p-2.5"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Copete: news title + current caption ── */}
      {title && (
        <div className="mt-4 text-center px-4">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-[#5CFF5C]">
            {title}
          </p>
          {current.caption && (
            <p className="mt-1 text-sm text-white/55 leading-snug">
              {current.caption}
            </p>
          )}
        </div>
      )}

      {/* ── Counter + dots ── */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a foto ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1 rounded-full transition-all duration-400 ${
                i === active ? 'w-6 bg-[#5CFF5C]' : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        <span className="text-[0.6rem] font-mono text-white/30 select-none">
          {active + 1} / {images.length} · click para ampliar
        </span>
      </div>
    </div>
  )
}

/* ─── Single / 2-image simple grid ──────────────────────────────────────────── */

function SimpleGrid({ images, onOpen }: { images: GalleryImage[]; onOpen: (i: number) => void }) {
  return (
    <div className={`grid gap-2 ${images.length === 1 ? '' : 'grid-cols-2'}`}>
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          aria-label={img.alt ?? `Foto ${i + 1}`}
          onClick={() => onOpen(i)}
          className="group relative overflow-hidden rounded-xl cursor-zoom-in ring-0 ring-[#5CFF5C]/50 transition-all duration-300 hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70"
        >
          <div className={`relative overflow-hidden ${images.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
            <Image
              src={img.url}
              alt={img.alt ?? ''}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              placeholder="blur"
              blurDataURL={img.blurDataURL ?? UNC_BLUR}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-300 flex items-end p-3">
              {img.caption && (
                <p className="translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 text-xs text-white font-medium line-clamp-2">
                  {img.caption}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ─── Main export ─────────────────────────────────────────────────────────────── */

export default function NewsGallery({ images, title }: NewsGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const open = useCallback((i: number) => {
    setLightboxIndex(i)
    document.body.style.overflow = 'hidden'
  }, [])

  const close = useCallback(() => {
    setLightboxIndex(null)
    document.body.style.overflow = ''
  }, [])

  const prev = useCallback(() =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null)),
    [images.length]
  )

  const next = useCallback(() =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null)),
    [images.length]
  )

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, prev, next, close])

  useEffect(() => () => { document.body.style.overflow = '' }, [])

  if (images.length === 0) return null

  return (
    <div className="mt-16">
      {/* Section divider */}
      <div className="mb-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/35">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {images.length} {images.length === 1 ? 'foto' : 'fotos'}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {images.length >= 3 ? (
        <CoverflowCarousel images={images} title={title} onOpen={open} />
      ) : (
        <SimpleGrid images={images} onOpen={open} />
      )}

      {/* Lightbox */}
      {mounted && lightboxIndex !== null &&
        createPortal(
          <Lightbox images={images} index={lightboxIndex} onClose={close} onPrev={prev} onNext={next} title={title} />,
          document.body
        )
      }
    </div>
  )
}
