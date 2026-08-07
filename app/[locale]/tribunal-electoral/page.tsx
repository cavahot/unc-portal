import { getTranslations, getLocale } from 'next-intl/server'
import { getTribunalMiembros, getTribunalDocumentos, DEMO_MIEMBROS, DEMO_DOCUMENTOS } from '@/lib/cms/queries/tribunal'
import TribunalAcordeonClient from '@/components/tribunal/TribunalAcordeonClient'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.tribunal-electoral.meta')
  return {
    title:       t('title'),
    description: t('description'),
  }
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}


export default async function TribunalElectoralPage() {
  const locale = await getLocale()
  const t      = await getTranslations('pages.tribunal-electoral')

  const [miembros, documentos] = await Promise.all([
    getTribunalMiembros().catch(() => DEMO_MIEMBROS),
    getTribunalDocumentos().catch(() => DEMO_DOCUMENTOS),
  ])

  const principalDocs = documentos.filter(d =>
    d.tipo === 'principal-cronograma' || d.tipo === 'principal-reglamento',
  )
  const accordionDocs = documentos.filter(d =>
    d.tipo !== 'principal-cronograma' && d.tipo !== 'principal-reglamento',
  )

  const accordionT = {
    tipos:       {
      'lista-inscriptos': t('accordion.tipos.lista-inscriptos'),
      'formato-notas':    t('accordion.tipos.formato-notas'),
      'padron-electoral': t('accordion.tipos.padron-electoral'),
      'candidaturas':     t('accordion.tipos.candidaturas'),
      'oficializacion':   t('accordion.tipos.oficializacion'),
      'proclamacion':     t('accordion.tipos.proclamacion'),
    },
    viewDoc:     t('accordion.viewDoc'),
    noDocuments: t('accordion.noDocuments'),
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <li>
              <Link href={`/${locale}`} className="transition-colors hover:text-slate-300">
                Inicio
              </Link>
            </li>
            <li aria-hidden className="select-none">/</li>
            <li className="font-medium text-[#5CFF5C]">{t('breadcrumb')}</li>
          </ol>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800/50">
        {/* Background grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(92,255,92,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(92,255,92,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#5CFF5C]/5 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#5CFF5C]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#5CFF5C]" />
              {t('hero.badge')}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-400 sm:text-xl">
              {t('hero.description')}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">

        {/* ── Members ──────────────────────────────────────────────── */}
        <section aria-labelledby="members-heading" className="mb-16">
          <div className="mb-8">
            <h2
              id="members-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              {t('members.title')}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{t('members.subtitle')}</p>
          </div>

          {/* Row 1: Presidente + Vicepresidente — centered */}
          <div className="mb-4 flex flex-wrap justify-center gap-4">
            {miembros.slice(0, 2).map(miembro => (
              <article
                key={miembro.id}
                className="group flex w-[calc(50%-0.5rem)] flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center transition-all hover:border-[#5CFF5C]/30 hover:bg-slate-900 sm:w-52"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-slate-700 transition-colors group-hover:border-[#5CFF5C]/40">
                  {miembro.foto?.url ? (
                    <Image src={miembro.foto.url} alt={miembro.foto.alt ?? miembro.nombre} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#5CFF5C]/10 text-xl font-bold text-[#5CFF5C]">
                      {getInitials(miembro.nombre)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug text-slate-100">{miembro.nombre}</p>
                  <p className="mt-1 text-xs font-medium text-[#5CFF5C]">{miembro.cargo}</p>
                </div>
              </article>
            ))}
          </div>
          {/* Row 2: remaining members */}
          <div className="flex flex-wrap justify-center gap-4">
            {miembros.slice(2).map(miembro => (
              <article
                key={miembro.id}
                className="group flex w-[calc(33%-0.5rem)] flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center transition-all hover:border-[#5CFF5C]/30 hover:bg-slate-900 sm:w-52"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-slate-700 transition-colors group-hover:border-[#5CFF5C]/40">
                  {miembro.foto?.url ? (
                    <Image src={miembro.foto.url} alt={miembro.foto.alt ?? miembro.nombre} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#5CFF5C]/10 text-xl font-bold text-[#5CFF5C]">
                      {getInitials(miembro.nombre)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug text-slate-100">{miembro.nombre}</p>
                  <p className="mt-1 text-xs font-medium text-[#5CFF5C]">{miembro.cargo}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Main downloads ───────────────────────────────────────── */}
        {principalDocs.length > 0 && (
          <section aria-labelledby="downloads-heading" className="mb-16">
            <div className="mb-8">
              <h2
                id="downloads-heading"
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                {t('downloads.title')}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{t('downloads.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {principalDocs.map(doc => {
                const isCronograma = doc.tipo === 'principal-cronograma'
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col items-start gap-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/10">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5CFF5C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
                          {isCronograma ? (
                            <>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </>
                          ) : (
                            <>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </>
                          )}
                        </svg>
                      </div>
                      <p className="font-semibold text-slate-100">{doc.titulo}</p>
                    </div>

                    {doc.driveUrl ? (
                      <a
                        href={doc.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#5CFF5C] px-5 py-2.5 text-sm font-bold text-slate-950 transition-all hover:bg-[#8AFF8A] hover:shadow-lg hover:shadow-[#5CFF5C]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                      >
                        {t('downloads.download')}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-500">
                        {t('downloads.pending')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Accordion ────────────────────────────────────────────── */}
        <section aria-labelledby="accordion-heading">
          <div className="mb-8">
            <h2
              id="accordion-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              {t('accordion.title')}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{t('accordion.subtitle')}</p>
          </div>

          <TribunalAcordeonClient documentos={accordionDocs} t={accordionT} />
        </section>
      </div>
    </main>
  )
}
