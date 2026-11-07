// INST-07: /calendario-academico en el sistema visual del portal, con las fechas en el CMS (colección `calendario-academico`).
// Spec: docs/specs/portal/CALENDARIO.md §2.6. Antes las fechas estaban escritas como texto en los archivos de mensajes y cada
// idioma las traducía a mano; ahora salen de `getCalendario()` como fechas reales y se formatean con el idioma de la persona.
// Estados: `ok`, `empty` (el CMS respondió sin bloques activos) y `unavailable` (el CMS no respondió): aviso en línea con una
// salida (reintentar solo si no respondió, y Contacto); nunca fechas escritas en el código ni un modal.
// El aviso de «fechas orientativas» va en la cabecera, no al pie: es lo primero que la persona debe leer.
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import { getT } from '@/lib/i18n/server'
import { getCalendario } from '@/lib/cms/queries/calendario'
import { formatFechas, formatPeriodo, type CalendarioEntrada } from '@/lib/cms/calendario'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.calendario-academico')
  return { title: t('meta.title'), description: t('meta.description') }
}

const h2 = 'font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl'

export default async function CalendarioAcademicoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.calendario-academico'), getCalendario()])
  const prefix = locale === 'es' ? '' : `${locale}/`
  const calendario = result.status === 'ok' ? result.calendario : null

  /** Texto del evento de una entrada de semestre: el del catálogo traducido, o la descripción libre de un «otro». */
  const etiqueta = (e: CalendarioEntrada) => (e.evento === 'otro' ? (e.descripcion ?? '') : e.evento ? t(`eventos.${e.evento}`) : '')

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={calendario ? t('hero.description', { anio: calendario.anio }) : t('hero.descriptionGeneric')}
        note={calendario ? t('note.body') : null}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {calendario ? (
            <div className="flex flex-col gap-16">
              {calendario.semestres.length > 0 && (
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
                  {calendario.semestres.map((s) => (
                    <section key={s.id} aria-labelledby={`semestre-${s.id}`}>
                      <h2 id={`semestre-${s.id}`} className={h2}>
                        {s.titulo}
                      </h2>
                      <dl className="mt-8 divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
                        {s.entradas.map((e, i) => (
                          <div key={i} className="grid gap-x-6 gap-y-1 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:px-8">
                            <dt className="text-lg font-semibold text-[#09231D]">{etiqueta(e)}</dt>
                            <dd className="text-lg font-bold tabular-nums text-[#004700]">{formatFechas(e.inicio, e.fin, locale, calendario.anio)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              )}

              {calendario.examenes.map((b) => (
                <section key={b.id} aria-labelledby={`examenes-${b.id}`}>
                  <h2 id={`examenes-${b.id}`} className={h2}>
                    {t('examenes.title')}
                  </h2>
                  <div className="mt-8 overflow-x-auto rounded-2xl bg-white">
                    <table className="w-full min-w-[20rem] text-left">
                      <caption className="sr-only">{b.titulo}</caption>
                      <thead>
                        <tr className="border-b border-[#D7E0DB]">
                          <th scope="col" className="px-6 py-4 text-sm font-semibold text-[#3E4A45] sm:px-8">
                            {t('examenes.periodo')}
                          </th>
                          <th scope="col" className="px-6 py-4 text-sm font-semibold text-[#3E4A45] sm:px-8">
                            {t('examenes.fechas')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D7E0DB]">
                        {b.entradas.map((e, i) => (
                          <tr key={i}>
                            <th scope="row" className="px-6 py-5 text-lg font-semibold text-[#09231D] sm:px-8">
                              {formatPeriodo(e.inicio, locale)}
                            </th>
                            <td className="px-6 py-5 text-lg font-bold tabular-nums text-[#004700] sm:px-8">{formatFechas(e.inicio, e.fin, locale, calendario.anio, false)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}calendario-academico`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
