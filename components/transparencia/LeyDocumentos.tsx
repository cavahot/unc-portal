// TRANS-01: vista común de /ley-5189 y /ley-5282 (spec docs/specs/portal/TRANSPARENCIA-LEYES.md §2.2).
// Qué hace: pinta el resultado de `getLeyDocuments` en tres estados distintos y sin datos de demostración:
//   - ok: categorías con sus documentos; las que no tienen ninguno muestran "Documentos aún no publicados".
//   - empty: el CMS respondió sin filas; se explica y se muestra la estructura legal.
//   - unavailable: el CMS no respondió; aviso neutro SIN lista de categorías (no se insinúa que no hay documentos).
// Por qué un componente: las dos leyes compartían 288 líneas casi idénticas que ya divergían.
// Seguridad (DEP-15): todo `href` que viene del CMS pasa por safeHref; además el módulo de datos descarta enlaces
// fuera de la allowlist. Límite: no comprueba que el archivo siga compartido en Drive.
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import { safeHref } from '@/lib/security/safeUrl'
import type { LeyCategoryGroup, LeyResult } from '@/lib/cms/transparenciaLeyes'

type T = (key: string, values?: Record<string, string | number | Date | undefined>) => string

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008000] focus-visible:ring-offset-2'

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

/** Panel de estado (vacío o no disponible): `role="status"` para que lo anuncie un lector de pantalla. */
function StatePanel({ title, text, tone }: { title: string; text: string; tone: 'info' | 'warn' }) {
  const palette = tone === 'warn' ? 'border-[#E4C99A] bg-[#FFF8EC] text-[#5B3B00]' : 'border-[#BFE3BF] bg-[#EEFAEE] text-[#0B3B0B]'
  return (
    <div role="status" className={`mb-8 flex gap-3 rounded-2xl border p-5 sm:p-6 ${palette}`}>
      <IconClock />
      <div>
        <p className="text-base font-bold">{title}</p>
        <p className="mt-1 max-w-2xl text-sm leading-6 opacity-90">{text}</p>
      </div>
    </div>
  )
}

function CategorySection({ group, index, t }: { group: LeyCategoryGroup; index: number; t: T }) {
  const headingId = `cat-${group.category}-title`
  return (
    <section id={`cat-${group.category}`} aria-labelledby={headingId} className="mb-6 scroll-mt-28">
      <div className="mb-2.5 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#004700]/10 text-[#004700]">
          <IconFolder />
        </span>
        <h3 id={headingId} className="flex-1 text-base font-bold leading-snug tracking-tight text-[#09231D]">
          <span className="mr-1.5 font-extrabold text-[#008000]">{index + 1}.</span>
          {group.label}
          {group.description && <span className="mt-0.5 block text-sm font-normal leading-snug text-[#4A5C56]">{group.description}</span>}
        </h3>
        <span className="shrink-0 pt-1 text-xs font-semibold text-[#4A5C56]">{t('docs.count', { count: group.docs.length })}</span>
      </div>

      {group.docs.length === 0 ? (
        <p className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#C3D0C9] bg-white/60 px-4 py-3.5 text-sm text-[#4A5C56]">
          <IconClock />
          {t('docs.noDocs')}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[#D7E0DB] bg-white">
          {group.docs.map((doc, i) => (
            <li key={doc.id} className={`flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[#F4F7F5] sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${i > 0 ? 'border-t border-[#D7E0DB]/70' : ''}`}>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="shrink-0 rounded-full bg-[#004700]/10 px-2.5 py-0.5 text-xs font-bold text-[#004700]">{doc.period}</span>
                {doc.description && <span className="text-sm leading-snug text-[#3F514B]">{doc.description}</span>}
              </div>
              <a
                href={safeHref(doc.driveUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('docs.openLabel')}: ${group.label} — ${doc.period}`}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#004700] bg-[#004700] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#005c00] sm:self-auto ${FOCUS}`}
              >
                {t('docs.openLabel')}
                <IconExternal />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function LeyDocumentos({ locale, result, t }: { locale: string; result: LeyResult; t: T }) {
  const prefix = locale === 'es' ? '' : `${locale}/`
  const groups = result.status === 'unavailable' ? [] : result.groups
  const withDocs = groups.filter((g) => g.docs.length > 0).length
  const percent = groups.length ? Math.round((withDocs / groups.length) * 100) : 0

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-white/80">
              <li>
                <Link href={`/${prefix}`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li>
                <Link href={`/${prefix}institucional`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  {t('breadcrumb.institutional')}
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">{t('breadcrumb.page')}</li>
            </ol>
          </nav>

          <Reveal>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold text-[#B8FFB8]">
              {t('hero.badgeLabel')}
            </div>
            <span className="block text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">{t('hero.eyebrow')}</span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">{t('hero.title')}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{t('hero.description')}</p>
          </Reveal>
        </div>
      </section>

      {/* ── DOCUMENTOS ───────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-8 bg-[#F4F7F5] pb-20 pt-12 sm:pb-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-8 max-w-3xl">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#006600]">{t('docs.eyebrow')}</span>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.03em] text-[#09231D] sm:text-4xl">{t('docs.heading')}</h2>
              <p className="mt-3 text-base leading-7 text-[#3F514B]">{t('docs.description')}</p>
            </div>
          </Reveal>

          {result.status === 'unavailable' && <StatePanel tone="warn" title={t('docs.unavailableTitle')} text={t('docs.unavailableText')} />}
          {result.status === 'empty' && <StatePanel tone="info" title={t('docs.emptyTitle')} text={t('docs.emptyText')} />}

          {groups.length > 0 && (
            <>
              {/* Resumen de avance: el texto transmite el dato; la barra es decorativa. */}
              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#D7E0DB] bg-white px-4 py-3">
                <p className="text-sm font-semibold text-[#004700]">{t('docs.summary', { withDocs, total: groups.length })}</p>
                <div aria-hidden="true" className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-[#E2EAE5]">
                  <div className="h-full rounded-full bg-[#008000]" style={{ width: `${percent}%` }} />
                </div>
              </div>

              {/* Índice de categorías: 17 ítems exigen un salto directo, sobre todo en móvil. */}
              <nav aria-label={t('docs.indexLabel')} className="mb-9">
                <ul className="flex flex-wrap gap-2">
                  {groups.map((g, i) => (
                    <li key={g.category}>
                      <a
                        href={`#cat-${g.category}`}
                        title={g.label}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-bold transition-colors ${FOCUS} ${
                          g.docs.length > 0
                            ? 'border-[#004700] bg-[#004700] text-white hover:bg-[#005c00]'
                            : 'border-[#C3D0C9] bg-white text-[#3F514B] hover:border-[#008000] hover:text-[#004700]'
                        }`}
                      >
                        {i + 1}
                        <span className="sr-only">: {g.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {groups.map((group, i) => (
                <CategorySection key={group.category} group={group} index={i} t={t} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* ── MARCO NORMATIVO ──────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-[1.5rem] border border-[#D7E0DB] bg-[#F4F7F5] p-8 lg:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
                <div className="flex-1">
                  <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#006600]">{t('info.eyebrow')}</span>
                  <h2 className="mt-4 font-serif text-2xl font-bold tracking-[-0.03em] text-[#09231D]">{t('info.title')}</h2>
                  <p className="mt-3 text-base leading-7 text-[#3F514B]">{t('info.description')}</p>
                </div>
                <div className="flex flex-col gap-3 lg:shrink-0">
                  <Link href={`/${prefix}transparencia`} className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#004700] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005c00] ${FOCUS}`}>
                    {t('info.ctaTransparencia')}
                  </Link>
                  <Link href={`/${prefix}institucional`} className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#C3D0C9] bg-white px-6 py-3 text-sm font-bold text-[#09231D] transition-colors hover:border-[#008000] ${FOCUS}`}>
                    {t('info.ctaInstitutional')}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
