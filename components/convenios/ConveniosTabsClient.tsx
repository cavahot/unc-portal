'use client'

import { useState } from 'react'
import type { ConvenioItem, ConvenioType } from '@/lib/cms/queries/convenios'

/* ─── Icons ─────────────────────────────────────────────────── */

function IconExternalLink() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}
      className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11 3h6m0 0v6m0-6L10 10M5 5H4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-1" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7}
      className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true">
      <rect x="2" y="4" width="16" height="14" rx="2"/>
      <path strokeLinecap="round" d="M2 8h16M6 2v4M14 2v4"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7}
      className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true">
      <circle cx="10" cy="10" r="8"/>
      <path strokeLinecap="round" d="M10 6v4l3 2"/>
    </svg>
  )
}

/* ─── Card ───────────────────────────────────────────────────── */

function ConvenioCard({
  item,
  t,
}: {
  item: ConvenioItem
  t: { duration: string; signed: string; objective: string; viewDocument: string; noDocument: string }
}) {
  const typeColor =
    item.type === 'nacional'
      ? { pill: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/20' }
      : { pill: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:border-white/[0.15] hover:bg-white/[0.04]">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Year */}
        <span className="rounded-full bg-[#5CFF5C]/10 px-2.5 py-0.5 font-mono text-xs font-bold text-[#5CFF5C]">
          {item.year}
        </span>
        {/* Type */}
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeColor.pill} ${typeColor.border}`}>
          {item.type === 'nacional' ? 'Nacional' : 'Internacional'}
        </span>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">
        {item.title}
      </h3>

      {/* Parties */}
      <p className="line-clamp-2 text-xs leading-relaxed text-white/55">
        {item.parties}
      </p>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Objective */}
      <div>
        <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
          {t.objective}
        </p>
        <p className="line-clamp-3 text-xs leading-relaxed text-white/50">
          {item.objective}
        </p>
      </div>

      {/* Metadata */}
      {(item.signedMonth || item.duration) && (
        <div className="flex flex-wrap gap-3 text-xs text-white/40">
          {item.signedMonth && (
            <span className="flex items-center gap-1">
              <IconCalendar />
              {t.signed} {item.signedMonth}
            </span>
          )}
          {item.duration && (
            <span className="flex items-center gap-1">
              <IconClock />
              {item.duration}
            </span>
          )}
        </div>
      )}

      {/* Drive link */}
      {item.driveUrl ? (
        <a
          href={item.driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.viewDocument}: ${item.title}`}
          className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#5CFF5C] transition-colors hover:text-[#8AFF8A]"
        >
          {t.viewDocument}
          <IconExternalLink />
        </a>
      ) : (
        <p className="mt-auto text-xs text-white/25">{t.noDocument}</p>
      )}
    </article>
  )
}

/* ─── Empty state ────────────────────────────────────────────── */

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
          className="h-7 w-7 text-white/20" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h6m-3-3v6M5 8H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V9a1 1 0 00-1-1h-1M9 4h6l2 4H7L9 4z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-white/40">{title}</p>
      <p className="max-w-xs text-xs text-white/25">{description}</p>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */

interface Props {
  convenios: ConvenioItem[]
  translations: {
    tabs: { all: string; nacional: string; internacional: string }
    card: { duration: string; signed: string; objective: string; viewDocument: string; noDocument: string }
    empty: { title: string; description: string }
  }
}

type TabValue = 'all' | ConvenioType

const TABS: { value: TabValue; labelKey: keyof Props['translations']['tabs'] }[] = [
  { value: 'all',            labelKey: 'all' },
  { value: 'nacional',       labelKey: 'nacional' },
  { value: 'internacional',  labelKey: 'internacional' },
]

export default function ConveniosTabsClient({ convenios, translations }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const { tabs, card, empty } = translations

  const filtered =
    activeTab === 'all'
      ? convenios
      : convenios.filter(c => c.type === activeTab)

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Filtrar convenios"
        className="mb-8 grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1 sm:inline-flex sm:w-auto"
      >
        {TABS.map(tab => (
          <button
            key={tab.value}
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={activeTab === tab.value}
            aria-controls={`panel-${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
            className={[
              'rounded-xl px-4 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]',
              activeTab === tab.value
                ? 'bg-[#5CFF5C]/15 text-[#5CFF5C]'
                : 'text-white/45 hover:text-white/75',
            ].join(' ')}
          >
            {tabs[tab.labelKey]}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.length === 0 ? (
            <EmptyState title={empty.title} description={empty.description} />
          ) : (
            filtered.map(item => (
              <ConvenioCard key={item.id} item={item} t={card} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
