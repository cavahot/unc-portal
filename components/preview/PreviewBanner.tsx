'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function PreviewBanner() {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function handleExit() {
    setExiting(true)
    await fetch('/api/disable-preview')
    router.refresh()
    router.push('/')
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[200] flex items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-amber-950 shadow-md"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {/* Eye icon */}
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Modo borrador activo — estás viendo contenido no publicado
      </div>

      <button
        type="button"
        onClick={handleExit}
        disabled={exiting}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-950 px-3 py-1 text-xs font-bold text-amber-100 transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-950 disabled:opacity-60"
      >
        {exiting ? (
          <>
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Saliendo…
          </>
        ) : (
          <>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Salir del modo borrador
          </>
        )}
      </button>
    </div>
  )
}
