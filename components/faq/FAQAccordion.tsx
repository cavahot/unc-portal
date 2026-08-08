'use client'

import { useState, useRef, useId } from 'react'
import type { FAQItem, FAQCategory } from '@/lib/cms/queries/faqs'
import { FAQ_CATEGORIES } from '@/lib/cms/queries/faqs'

/* ─── Rich text renderer (simple — only paragraphs and lists) ─────────────── */

function RichAnswer({ content }: { content: FAQItem['answer'] }) {
  const nodes = content?.root?.children ?? []
  return (
    <div className="space-y-3 text-sm leading-7 text-[#3A4A42]">
      {(nodes as any[]).map((node: any, i: number) => {
        if (node.type === 'paragraph') {
          const text = (node.children ?? [])
            .map((c: any) => {
              if (c.bold) return <strong key={c.text} className="font-semibold text-[#09231D]">{c.text}</strong>
              if (c.italic) return <em key={c.text}>{c.text}</em>
              if (c.type === 'link') return (
                <a key={c.text} href={c.url ?? '#'} className="font-medium text-[#008000] underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                  {(c.children ?? []).map((lc: any) => lc.text).join('')}
                </a>
              )
              return c.text
            })
          return <p key={i}>{text}</p>
        }
        if (node.type === 'ul' || node.type === 'list') {
          return (
            <ul key={i} className="list-inside list-disc space-y-1 pl-2">
              {(node.children ?? []).map((li: any, j: number) => (
                <li key={j}>{(li.children ?? []).map((c: any) => c.text).join('')}</li>
              ))}
            </ul>
          )
        }
        return null
      })}
    </div>
  )
}

/* ─── Single FAQ item ────────────────────────────────────────────────────── */

function FAQRow({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
        open
          ? 'border-[#37D448]/50 bg-white shadow-[0_8px_32px_rgba(0,71,0,0.10)]'
          : 'border-[#D7E0DB] bg-white/70 hover:border-[#37D448]/30 hover:bg-white hover:shadow-sm'
      }`}
    >
      <button
        type="button"
        id={`faq-btn-${id}`}
        aria-expanded={open}
        aria-controls={`faq-panel-${id}`}
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5CFF5C]/60"
      >
        {/* Number badge */}
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-extrabold transition-colors duration-300 ${
          open ? 'bg-[#004700] text-white' : 'bg-[#E6FFE6] text-[#004700] group-hover:bg-[#D0FFD0]'
        }`}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Question */}
        <span className={`flex-1 text-sm font-semibold leading-snug transition-colors duration-200 sm:text-base ${
          open ? 'text-[#004700]' : 'text-[#09231D]'
        }`}>
          {item.question}
        </span>

        {/* Chevron */}
        <span className={`mt-0.5 shrink-0 text-[#008000] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* Animated answer panel — grid trick for smooth height */}
      <div
        id={`faq-panel-${id}`}
        role="region"
        aria-labelledby={`faq-btn-${id}`}
        style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr' }}
        className="transition-[grid-template-rows] duration-300 ease-in-out"
      >
        <div ref={contentRef} className="overflow-hidden">
          <div className="border-t border-[#D7E0DB]/60 px-6 pb-6 pt-4">
            <div className="pl-10">
              {/* Green accent bar */}
              <div className="mb-3 h-0.5 w-8 rounded-full bg-[#37D448]" aria-hidden />
              <RichAnswer content={item.answer} />
              {item.tags && item.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span key={t.tag} className="rounded-full bg-[#F4F7F5] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#6C7B76]">
                      {t.tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main accordion with search + category filter ───────────────────────── */

interface FAQAccordionProps {
  items: FAQItem[]
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FAQCategory | 'all'>('all')

  const q = query.trim().toLowerCase()

  const filtered = items.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    if (!matchesCategory) return false
    if (!q) return true
    return (
      item.question.toLowerCase().includes(q) ||
      (item.tags ?? []).some((t) => t.tag.toLowerCase().includes(q))
    )
  })

  // Count per category
  const counts = FAQ_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.value] = items.filter((i) => i.category === cat.value).length
    return acc
  }, {})

  const usedCategories = FAQ_CATEGORIES.filter((cat) => (counts[cat.value] ?? 0) > 0)

  return (
    <div className="space-y-8">
      {/* ── Search bar ── */}
      <div className="relative">
        <label htmlFor="faq-search" className="sr-only">Buscar pregunta</label>
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#9EAC9E]" aria-hidden>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar una pregunta…"
          className="w-full rounded-2xl border border-[#D7E0DB] bg-white py-4 pl-12 pr-4 text-sm text-[#09231D] placeholder:text-[#9EAC9E] shadow-sm transition-all focus:border-[#37D448] focus:outline-none focus:ring-2 focus:ring-[#5CFF5C]/30"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-[#9EAC9E] hover:text-[#3A4A42] transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Category chips ── */}
      {!query && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] ${
              activeCategory === 'all'
                ? 'bg-[#004700] text-white shadow-md'
                : 'border border-[#D7E0DB] bg-white text-[#3A4A42] hover:border-[#37D448]/50 hover:text-[#004700]'
            }`}
          >
            Todas
            <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-extrabold ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[#E6FFE6] text-[#004700]'}`}>
              {items.length}
            </span>
          </button>

          {usedCategories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value as FAQCategory)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] ${
                activeCategory === cat.value
                  ? 'bg-[#004700] text-white shadow-md'
                  : 'border border-[#D7E0DB] bg-white text-[#3A4A42] hover:border-[#37D448]/50 hover:text-[#004700]'
              }`}
            >
              <span aria-hidden>{cat.icon}</span>
              {cat.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-extrabold ${activeCategory === cat.value ? 'bg-white/20 text-white' : 'bg-[#E6FFE6] text-[#004700]'}`}>
                {counts[cat.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6FFE6] text-3xl">🔍</div>
          <p className="font-semibold text-[#09231D]">No encontramos resultados para <em>"{query}"</em></p>
          <p className="mt-1 text-sm text-[#6C7B76]">Probá con otras palabras o explorá las categorías.</p>
          <button
            type="button"
            onClick={() => { setQuery(''); setActiveCategory('all') }}
            className="mt-5 rounded-full border border-[#D7E0DB] bg-white px-5 py-2 text-sm font-semibold text-[#3A4A42] transition hover:border-[#37D448]/60 hover:text-[#004700]"
          >
            Ver todas las preguntas
          </button>
        </div>
      ) : (
        <>
          {/* Show category sections when viewing all (no search) */}
          {activeCategory === 'all' && !query ? (
            usedCategories.map((cat) => {
              const catItems = filtered.filter((i) => i.category === cat.value)
              if (catItems.length === 0) return null
              return (
                <section key={cat.value} aria-labelledby={`cat-${cat.value}`}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-xl" aria-hidden>{cat.icon}</span>
                    <h2 id={`cat-${cat.value}`} className="font-serif text-lg font-bold text-[#09231D]">
                      {cat.label}
                    </h2>
                    <div className="h-px flex-1 bg-[#D7E0DB]" aria-hidden />
                    <span className="text-[0.65rem] font-bold text-[#9EAC9E]">{catItems.length} pregunta{catItems.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-3">
                    {catItems.map((item, idx) => (
                      <FAQRow key={item.id} item={item} index={idx} />
                    ))}
                  </div>
                </section>
              )
            })
          ) : (
            <div className="space-y-3">
              {query && (
                <p className="text-sm text-[#6C7B76]">
                  <span className="font-semibold text-[#09231D]">{filtered.length}</span> resultado{filtered.length !== 1 ? 's' : ''} para <em>"{query}"</em>
                </p>
              )}
              {filtered.map((item, idx) => (
                <FAQRow key={item.id} item={item} index={idx} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
