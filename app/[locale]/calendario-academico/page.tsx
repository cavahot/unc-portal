import type { Metadata } from 'next'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.calendario-academico')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.6} />
      <path strokeLinecap="round" strokeWidth={1.6} d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export default async function CalendarioAcademicoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.calendario-academico')

  const semesterKeys = ['s1', 's2'] as const
  const semesterColors = ['border-[#5CFF5C]/30', 'border-white/20']
  const eventKeys = ['e1', 'e2', 'e3', 'e4', 'e5'] as const
  const finalKeys = ['f1', 'f2', 'f3', 'f4'] as const

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            {t('hero.label')}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-lg text-white/60">
            {t('hero.description')}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 space-y-12">
        {/* Semestres */}
        <div className="grid gap-6 sm:grid-cols-2">
          {semesterKeys.map((sKey, si) => (
            <div key={sKey} className={`rounded-2xl border ${semesterColors[si]} bg-white/[0.03] p-6`}>
              <h2 className="font-semibold text-white">{t(`semesters.${sKey}.label`)}</h2>
              <ul className="mt-4 space-y-3">
                {eventKeys.map((eKey) => (
                  <li key={eKey} className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#5CFF5C]"><CalendarIcon /></span>
                    <span>
                      <span className="block text-xs font-semibold text-[#8AFF8A]">{t(`semesters.${sKey}.${eKey}.fecha`)}</span>
                      <span className="text-sm text-white/60">{t(`semesters.${sKey}.${eKey}.descripcion`)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mesas de finales */}
        <div>
          <h2 className="text-xl font-bold text-white">{t('finals.title')}</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-5 py-3 text-left font-semibold text-white/70">{t('finals.headerPeriod')}</th>
                  <th className="px-5 py-3 text-left font-semibold text-white/70">{t('finals.headerDates')}</th>
                </tr>
              </thead>
              <tbody>
                {finalKeys.map((fKey, i) => (
                  <tr key={fKey} className={i % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                    <td className="px-5 py-3 text-white/80">{t(`finals.${fKey}.periodo`)}</td>
                    <td className="px-5 py-3 text-[#8AFF8A]">{t(`finals.${fKey}.fechas`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota */}
        <div className="rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/5 p-5">
          <p className="text-sm text-white/60">
            <span className="font-semibold text-[#8AFF8A]">{t('note.label')}</span>
            {t('note.body')}
          </p>
        </div>
      </div>
    </div>
  )
}
