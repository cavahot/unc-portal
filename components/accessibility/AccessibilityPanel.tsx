'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

/* ─── State ─────────────────────────────────────────────── */

interface A11yState {
  fontSize: number
  grayscale: boolean
  highContrast: boolean
  negative: boolean
  lightBg: boolean
  underlineLinks: boolean
  readableFont: boolean
}

const DEFAULT_STATE: A11yState = {
  fontSize: 100,
  grayscale: false,
  highContrast: false,
  negative: false,
  lightBg: false,
  underlineLinks: false,
  readableFont: false,
}

const LS_KEY = 'unc-a11y'
const FONT_STEP = 20
const FONT_MIN = 80
const FONT_MAX = 160

function readStorage(): A11yState {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_STATE
  }
}

/* ─── Hook ───────────────────────────────────────────────── */

function useA11y() {
  const [state, setState] = useState<A11yState>(DEFAULT_STATE)

  // Init from localStorage synchronously before paint (no FOUC)
  useLayoutEffect(() => {
    setState(readStorage())
  }, [])

  // Apply to DOM + persist whenever state changes
  useEffect(() => {
    const h = document.documentElement
    h.style.fontSize = state.fontSize !== 100 ? `${state.fontSize}%` : ''
    h.classList.toggle('a11y-grayscale',       state.grayscale)
    h.classList.toggle('a11y-high-contrast',   state.highContrast)
    h.classList.toggle('a11y-negative',        state.negative)
    h.classList.toggle('a11y-light-bg',        state.lightBg)
    h.classList.toggle('a11y-underline-links', state.underlineLinks)
    h.classList.toggle('a11y-readable-font',   state.readableFont)
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])

  const toggle = useCallback(
    (key: keyof Omit<A11yState, 'fontSize'>) => {
      setState(prev => {
        const next = { ...prev, [key]: !prev[key] }
        if (key === 'grayscale'    && next.grayscale)    next.negative     = false
        if (key === 'negative'     && next.negative)     next.grayscale    = false
        if (key === 'highContrast' && next.highContrast) next.lightBg      = false
        if (key === 'lightBg'      && next.lightBg)      next.highContrast = false
        return next
      })
    },
    [],
  )

  const increaseFontSize = useCallback(() => {
    setState(prev => ({ ...prev, fontSize: Math.min(prev.fontSize + FONT_STEP, FONT_MAX) }))
  }, [])

  const decreaseFontSize = useCallback(() => {
    setState(prev => ({ ...prev, fontSize: Math.max(prev.fontSize - FONT_STEP, FONT_MIN) }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
    localStorage.removeItem(LS_KEY)
  }, [])

  return { state, toggle, increaseFontSize, decreaseFontSize, reset }
}

/* ─── Icons ──────────────────────────────────────────────── */

function IconAccessibility() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M7 9h10M12 9v6M9 21l3-6 3 6" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/* ─── Tool definitions ───────────────────────────────────── */

type ToolKey = keyof Omit<A11yState, 'fontSize'>

interface Tool {
  key: ToolKey | 'increaseFontSize' | 'decreaseFontSize' | 'reset'
  label: string
  icon: React.ReactNode
}

function IconTextUp()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><text x="3" y="16" fontSize="13" fontWeight="700" stroke="none" fill="currentColor">A</text><text x="13" y="12" fontSize="9" stroke="none" fill="currentColor">A</text><path d="M19 6v6M16 9h6" strokeWidth={1.8}/></svg> }
function IconTextDown() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><text x="3" y="16" fontSize="13" fontWeight="700" stroke="none" fill="currentColor">A</text><text x="13" y="12" fontSize="9" stroke="none" fill="currentColor">A</text><path d="M16 9h6" strokeWidth={1.8}/></svg> }
function IconGrayscale()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18V3z" fill="currentColor" stroke="none"/></svg> }
function IconContrast()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 0 0 18" fill="currentColor" stroke="none"/></svg> }
function IconNegative()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 3l18 18" strokeWidth={1.5}/></svg> }
function IconLightBg()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> }
function IconUnderline()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/></svg> }
function IconReadableFont()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h13"/></svg> }
function IconReset()         { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/></svg> }

/* ─── ToolButton ─────────────────────────────────────────── */

function ToolButton({
  label,
  icon,
  active,
  onClick,
  isReset = false,
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
  isReset?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isReset ? undefined : active}
      title={label}
      className={[
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center text-[0.65rem] font-medium leading-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]',
        isReset
          ? 'border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white/80'
          : active
          ? 'border-[#5CFF5C]/50 bg-[#5CFF5C]/15 text-[#5CFF5C]'
          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/90',
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/* ─── Main component ─────────────────────────────────────── */

export default function AccessibilityPanel() {
  const t = useTranslations('accessibility')
  const [isOpen, setIsOpen] = useState(false)
  const { state, toggle, increaseFontSize, decreaseFontSize, reset } = useA11y()
  const panelRef  = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Focus trap + Escape + click outside
  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current
    if (!panel) return

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
      ),
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  const tools: Tool[] = [
    { key: 'increaseFontSize', label: t('tools.increaseFontSize'), icon: <IconTextUp /> },
    { key: 'decreaseFontSize', label: t('tools.decreaseFontSize'), icon: <IconTextDown /> },
    { key: 'grayscale',        label: t('tools.grayscale'),        icon: <IconGrayscale /> },
    { key: 'highContrast',     label: t('tools.highContrast'),     icon: <IconContrast /> },
    { key: 'negative',         label: t('tools.negative'),         icon: <IconNegative /> },
    { key: 'lightBg',          label: t('tools.lightBg'),          icon: <IconLightBg /> },
    { key: 'underlineLinks',   label: t('tools.underlineLinks'),   icon: <IconUnderline /> },
    { key: 'readableFont',     label: t('tools.readableFont'),     icon: <IconReadableFont /> },
    { key: 'reset',            label: t('tools.reset'),            icon: <IconReset /> },
  ]

  function handleTool(key: Tool['key']) {
    if (key === 'increaseFontSize') { increaseFontSize(); return }
    if (key === 'decreaseFontSize') { decreaseFontSize(); return }
    if (key === 'reset')            { reset(); return }
    toggle(key as ToolKey)
  }

  function isActive(key: Tool['key']): boolean {
    if (key === 'increaseFontSize' || key === 'decreaseFontSize' || key === 'reset') return false
    return state[key as ToolKey] as boolean
  }

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        aria-label={t('triggerLabel')}
        className="fixed right-0 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-[#5CFF5C]/30 bg-[#004700] text-white shadow-[0_4px_24px_rgba(0,71,0,0.6)] transition-all duration-200 hover:w-14 hover:bg-[#005c00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <IconAccessibility />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      <aside
        id="accessibility-panel"
        ref={panelRef}
        aria-label={t('panelLabel')}
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-[280px] max-w-full flex-col bg-slate-900 shadow-[-8px_0_40px_rgba(0,0,0,0.5)] transition-transform duration-250 ease-out sm:w-[300px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#004700]/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <IconAccessibility />
            <h2 className="text-sm font-semibold text-white">
              {t('panelTitle')}
            </h2>
          </div>
          <button
            onClick={() => { setIsOpen(false); triggerRef.current?.focus() }}
            aria-label={t('closePanel')}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
          >
            <IconClose />
          </button>
        </div>

        {/* Font size indicator */}
        <div className="border-b border-white/10 px-5 py-3">
          <p className="text-[0.65rem] uppercase tracking-widest text-white/40">{t('fontSizeLabel')}</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{state.fontSize}%</p>
        </div>

        {/* Tools grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            {tools.map(tool => (
              <ToolButton
                key={tool.key}
                label={tool.label}
                icon={tool.icon}
                active={isActive(tool.key)}
                isReset={tool.key === 'reset'}
                onClick={() => handleTool(tool.key)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-[0.6rem] leading-4 text-white/30">
            {t('settingsSaved')}
          </p>
        </div>
      </aside>
    </>
  )
}
