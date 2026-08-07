import { getT } from '@/lib/i18n/server'
import type { StatsData } from '@/lib/cms/queries/stats'
import StatCounter from './StatCounter'

// UNC began operations on August 3, 2009
const FOUNDING_DATE = new Date('2009-08-03')

function daysSinceFounding(): number {
  return Math.floor((Date.now() - FOUNDING_DATE.getTime()) / 86_400_000)
}

export default async function StatsBlock({
  locale,
  stats,
}: {
  locale: string
  stats: StatsData
}) {
  const t = await getT(locale, 'pages.home')

  const items = [
    { value: daysSinceFounding(), label: t('stats.items.diasActividad') },
    { value: stats.totalEstudiantes, label: t('stats.items.estudiantes') },
    { value: stats.totalCarrerasAcreditadas, label: t('stats.items.carrerasAcreditadas') },
    { value: stats.totalDocentes, label: t('stats.items.docentesColaboradores') },
    { value: stats.totalFacultades, label: t('stats.items.facultades') },
    { value: stats.totalEgresados, label: t('stats.items.egresados') },
  ]

  return (
    <section className="bg-slate-900 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            {t('stats.sectionLabel')}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {t('stats.title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((item) => (
            <StatCounter key={item.label} value={item.value} label={item.label} />
          ))}
        </div>
      </div>
    </section>
  )
}
