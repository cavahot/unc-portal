'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useParams } from 'next/navigation'

/* ── Config ─────────────────────────────────────────────────────────────────── */

const LOCALES = [
  { code: 'es',    label: 'Español',   country: 'es', short: 'ES' },
  { code: 'en',    label: 'English',   country: 'us', short: 'EN' },
  { code: 'pt-BR', label: 'Português', country: 'br', short: 'PT' },
  { code: 'gn',    label: 'Guaraní',   country: 'py', short: 'GN' },
] as const

type LocaleCode = (typeof LOCALES)[number]['code']

/* ── Flag image ──────────────────────────────────────────────────────────────── */

function FlagImg({ country, label }: { country: string; label: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w20/${country}.png`}
      srcSet={`https://flagcdn.com/w40/${country}.png 2x`}
      width={20}
      height={15}
      alt={label}
      className="h-3.5 w-5 rounded-[2px] object-cover"
    />
  )
}

/* ── Component ────────────────────────────────────────────────────────────── */

interface LocaleSwitcherProps {
  className?: string
}

export default function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
  const pathname = usePathname()
  const params = useParams()
  const currentLocale = (params?.locale as LocaleCode) ?? 'es'

  return (
    <nav
      aria-label="Cambiar idioma"
      className={`flex items-center gap-1 ${className}`}
    >
      {LOCALES.map(({ code, label, country, short }) => {
        const isActive = code === currentLocale

        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            aria-label={`${label}${isActive ? ' — idioma actual' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            className={`
              inline-flex h-8 items-center gap-1.5 rounded-full border px-2 text-[0.65rem] font-bold
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]
              ${isActive
                ? 'border-[#5CFF5C]/60 bg-[#00A300]/20 text-[#8AFF8A] shadow-[0_0_12px_-4px_rgba(92,255,92,0.4)]'
                : 'border-white/10 bg-white/[0.05] text-white/50 hover:border-white/25 hover:bg-white/[0.10] hover:text-white/80'
              }
            `}
          >
            <FlagImg country={country} label={label} />
            <span className="leading-none tracking-wide">{short}</span>
          </Link>
        )
      })}
    </nav>
  )
}
