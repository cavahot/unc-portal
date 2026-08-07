'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { UNC_BLUR } from '@/lib/imagePlaceholder'

interface GalleryImage {
  url: string
  alt?: string | null
  caption?: string | null
  blurDataURL?: string | null
}

interface NewsGalleryProps {
  images: GalleryImage[]
  title?: string
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

interface ThumbProps {
  image: GalleryImage
  index: number
  onOpen: (i: number) => void
  sizes?: string
  className?: string
  innerClassName?: string
}

function GalleryThumb({
  image,
  index,
  onOpen,
  sizes = '(max-width: 640px) 50vw, 33vw',
  className = '',
  innerClassName = '',
}: ThumbProps) {
  return (
    <button
      type="button"
      aria-label={image.alt ?? `Foto ${index + 1}`}
      onClick={() => onOpen(index)}
      className={`group relative overflow-hidden rounded-xl cursor-pointer ring-0 ring-[#5CFF5C]/50 transition-all duration-300 hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70 ${className}`}
    >
      <div className={`relative overflow-hidden ${innerClassName}`}>
        <Image
          src={image.url}
          alt={image.alt ?? ''}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          placeholder={image.blurDataURL ? 'blur' : 'blur'}
          blurDataURL={image.blurDataURL ?? UNC_BLUR}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end p-3">
          {image.caption && (
            <p className="translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 text-xs text-white font-medium line-clamp-2 leading-snug">
              {image.caption}
            </p>
          )}
        </div>
        {/* Zoom icon */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="rounded-full bg-black/60 p-1.5 backdrop-blur-sm">
            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Grid layouts ─────────────────────────────────────────────────────────────

function GalleryGrid({ images, onOpen }: { images: GalleryImage[]; onOpen: (i: number) => void }) {
  const count = images.length

  if (count === 1) {
    return (
      <GalleryThumb
        image={images[0]}
        index={0}
        onOpen={onOpen}
        sizes="(max-width: 768px) 100vw, 768px"
        className="w-full"
        innerClassName="aspect-[16/9]"
      />
    )
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {images.map((img, i) => (
          <GalleryThumb
            key={i}
            image={img}
            index={i}
            onOpen={onOpen}
            sizes="(max-width: 640px) 50vw, 380px"
            innerClassName="aspect-[4/3]"
          />
        ))}
      </div>
    )
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Featured left — spans 2 rows */}
        <GalleryThumb
          image={images[0]}
          index={0}
          onOpen={onOpen}
          sizes="(max-width: 640px) 50vw, 380px"
          className="row-span-2"
          innerClassName="h-full min-h-[260px] sm:min-h-[320px]"
        />
        {/* Two stacked right */}
        {images.slice(1).map((img, i) => (
          <GalleryThumb
            key={i + 1}
            image={img}
            index={i + 1}
            onOpen={onOpen}
            sizes="(max-width: 640px) 50vw, 380px"
            innerClassName="aspect-[4/3]"
          />
        ))}
      </div>
    )
  }

  // 4+ images: first image featured full-width, rest in 2–3 col grid
  const rest = images.slice(1)
  const restCols = rest.length <= 4 ? 2 : 3

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {/* Featured first image */}
      <GalleryThumb
        image={images[0]}
        index={0}
        onOpen={onOpen}
        sizes="(max-width: 768px) 100vw, 768px"
        className="w-full"
        innerClassName="aspect-[21/9]"
      />
      {/* Rest grid */}
      <div className={`grid gap-2 sm:gap-3 grid-cols-${restCols}`}
        style={{ gridTemplateColumns: `repeat(${restCols}, minmax(0, 1fr))` }}
      >
        {rest.map((img, i) => (
          <GalleryThumb
            key={i + 1}
            image={img}
            index={i + 1}
            onOpen={onOpen}
            sizes={`(max-width: 640px) ${Math.round(100 / restCols)}vw, ${Math.round(768 / restCols)}px`}
            innerClassName="aspect-[4/3]"
          />
        ))}
      </div>
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

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

  // Swipe support via pointer events
  const [dragStart, setDragStart] = useState<number | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStart(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart === null) return
    const delta = e.clientX - dragStart
    if (Math.abs(delta) > 50) {
      delta < 0 ? onNext() : onPrev()
    }
    setDragStart(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Galería de imágenes: ${title}` : 'Galería de imágenes'}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/50 text-sm font-mono select-none">
        {index + 1} / {total}
      </div>

      {/* Close button */}
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

      {/* Prev button */}
      {total > 1 && (
        <button
          type="button"
          aria-label="Imagen anterior"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/70 sm:left-6"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image area */}
      <div
        className="relative flex max-h-[80vh] max-w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Using key to remount on index change — gives a natural fade via Next.js Image */}
        <Image
          key={`lightbox-${index}`}
          src={current.url}
          alt={current.alt ?? ''}
          width={1600}
          height={900}
          className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-2xl animate-[fadeIn_0.2s_ease]"
          style={{ objectFit: 'contain' }}
          placeholder={current.blurDataURL ? 'blur' : 'blur'}
          blurDataURL={current.blurDataURL ?? UNC_BLUR}
          priority
        />
      </div>

      {/* Caption */}
      {current.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[80vw] text-center text-sm text-white/70 px-4" onClick={(e) => e.stopPropagation()}>
          {current.caption}
        </p>
      )}

      {/* Next button */}
      {total > 1 && (
        <button
          type="button"
          aria-label="Siguiente imagen"
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewsGallery({ images, title }: NewsGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const open = (i: number) => {
    setLightboxIndex(i)
    document.body.style.overflow = 'hidden'
  }

  const close = useCallback(() => {
    setLightboxIndex(null)
    document.body.style.overflow = ''
  }, [])

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null))
  }, [images.length])

  const next = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null))
  }, [images.length])

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

  // Cleanup overflow on unmount
  useEffect(() => {
    return () => { document.body.style.overflow = '' }
  }, [])

  if (images.length === 0) return null

  return (
    <div className="mt-12">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Galería · {images.length} {images.length === 1 ? 'foto' : 'fotos'}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Grid */}
      <GalleryGrid images={images} onOpen={open} />

      {/* Lightbox portal */}
      {mounted && lightboxIndex !== null &&
        createPortal(
          <Lightbox
            images={images}
            index={lightboxIndex}
            onClose={close}
            onPrev={prev}
            onNext={next}
            title={title}
          />,
          document.body
        )
      }
    </div>
  )
}
