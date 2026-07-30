'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* ── Config ─────────────────────────────────────────────── */

const DEFAULT_LOCALE = 'es'

const LOCALES = [
  { code: 'es',    label: 'Español',   flag: '🇵🇾', short: 'ES' },
  { code: 'en',    label: 'English',   flag: '🇺🇸', short: 'EN' },
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷', short: 'PT' },
  { code: 'gn',    label: 'Guaraní',   flag: '🇵🇾', short: 'GN' },
] as const

type LocaleCode = (typeof LOCALES)[number]['code']
const ALL_CODES = LOCALES.map((l) => l.code) as readonly string[]

/* ── URL helpers ─────────────────────────────────────────── */

function detectLocale(pathname: string): LocaleCode {
  const first = pathname.split('/').filter(Boolean)[0] ?? ''
  return (ALL_CODES.includes(first) ? first : DEFAULT_LOCALE) as LocaleCode
}

function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (ALL_CODES.includes(segments[0] ?? '')) {
    const rest = segments.slice(1).join('/')
    return rest ? `/${rest}` : '/'
  }
  return pathname
}

function buildPath(basePath: string, locale: LocaleCode): string {
  const path = basePath || '/'
  if (locale === DEFAULT_LOCALE) return path
  return `/${locale}${path === '/' ? '' : path}`
}

/* ── Component ───────────────────────────────────────────── */

interface LocaleSwitcherProps {
  className?: string
}

export default function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
  const pathname = usePathname()
  const currentLocale = detectLocale(pathname)
  const basePath = stripLocale(pathname)

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = LOCALES.find((l) => l.code === currentLocale) ?? LOCALES[0]

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointer(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Idioma actual: ${current.label}. Cambiar idioma`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 text-xs font-semibold text-white/80 transition-all duration-200 hover:border-[#5CFF5C] hover:bg-[#00A300] hover:text-[#001A00] hover:shadow-[0_8px_20px_-10px_rgba(0,209,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
      >
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.short}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-3 w-3 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4.427 6.427a.75.75 0 0 1 1.06 0L8 8.94l2.513-2.513a.75.75 0 1 1 1.06 1.06l-3.043 3.044a.75.75 0 0 1-1.06 0L4.427 7.487a.75.75 0 0 1 0-1.06z" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Seleccionar idioma"
          className="absolute right-0 top-full z-[60] mt-2 min-w-[9rem] overflow-hidden rounded-xl border border-white/10 bg-[#002800] py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]"
        >
          {LOCALES.map((locale) => {
            const href = buildPath(basePath, locale.code)
            const isActive = locale.code === currentLocale

            return (
              <Link
                key={locale.code}
                href={href}
                role="option"
                aria-selected={isActive}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#00A300]/20 text-[#8AFF8A]'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {locale.flag}
                </span>
                <span className="font-medium">{locale.label}</span>
                {isActive && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="ml-auto h-3.5 w-3.5 text-[#5CFF5C]"
                  >
                    <path d="M12.78 4.22a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L6.25 9.69l5.47-5.47a.75.75 0 0 1 1.06 0z" />
                  </svg>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
