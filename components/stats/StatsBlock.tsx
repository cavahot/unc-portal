// HOME-STATES-01: «UNC en números» del inicio. Qué hace: muestra solo las cifras publicadas en el CMS más los días de
// actividad (calculados, no cargados). Estados: `ok` (tarjetas), `empty` (la sección se oculta: no hay nada que decir),
// `unavailable` (aviso breve, sin cifras). Por qué: antes una caída del CMS mostraba cifras de relleno como reales.
// Límite: el aviso no reintenta; la página se revalida sola cada 60 s (ISR).
import { getT } from '@/lib/i18n/server'
import type { StatsResult } from '@/lib/cms/queries/stats'
import StatCounter from './StatCounter'

// UNC began operations on August 3, 2009
const FOUNDING_DATE = new Date('2009-08-03')

function daysSinceFounding(): number {
  return Math.floor((Date.now() - FOUNDING_DATE.getTime()) / 86_400_000)
}

export default async function StatsBlock({
  locale,
  result,
}: {
  locale: string
  result: StatsResult
}) {
  // empty: no hay cifras publicadas; ocultar la sección evita un bloque de un solo dato.
  if (result.state === 'empty') return null

  const t = await getT(locale, 'pages.home')
  const s = result.stats

  const items = [
    { value: daysSinceFounding(), label: t('stats.items.diasActividad') },
    { value: s.totalEstudiantes, label: t('stats.items.estudiantes') },
    { value: s.totalCarrerasAcreditadas, label: t('stats.items.carrerasAcreditadas') },
    { value: s.totalDocentes, label: t('stats.items.docentesColaboradores') },
    { value: s.totalFacultades, label: t('stats.items.facultades') },
    { value: s.totalEgresados, label: t('stats.items.egresados') },
  ].filter((i): i is { value: number; label: string } => typeof i.value === 'number')

  return (
    <section aria-labelledby="stats-title" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#006B00]">
            {t('stats.sectionLabel')}
          </p>
          <h2 id="stats-title" className="mt-2 font-serif text-3xl font-bold text-[#09231D] sm:text-4xl">
            {t('stats.title')}
          </h2>
        </div>
        {result.state === 'unavailable' ? (
          <p role="status" className="mx-auto max-w-[65ch] text-center text-base leading-7 text-[#3E4A45]">
            {t('stats.unavailable')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {items.map((item) => (
              <StatCounter key={item.label} value={item.value} label={item.label} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
