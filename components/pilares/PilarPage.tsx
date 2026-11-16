// PILARES-01 (S4): página de un pilar académico (/docencia, /investigacion, /extension).
// Qué hace: mientras el pilar esté «en construcción» en el CMS (o no tenga contenido, o el CMS no responda) muestra solo
//   el aviso de construcción con el título; publicada, muestra la descripción, sus estadísticas y el contenido.
// Por qué: el propietario pidió que por ahora las páginas aparezcan solo «en construcción», listas para cargarse desde
//   el CMS sin desplegar. Límite: no muestra el contenido sembrado hasta que alguien cambie el estado a «Publicada».
import PageHero from '@/components/pages/PageHero'
import RichText from '@/components/RichText'
import PilarIcon from '@/components/home/PilarIcon'
import { Link } from '@/i18n/navigation'
import type { PilarResult } from '@/lib/cms/queries/pilares'

export interface PilarPageLabels {
  inicio: string
  enConstruccion: string
  enConstruccionTexto: string
  volver: string
  estadisticas: string
}

export interface PilarPageProps {
  result: PilarResult
  labels: PilarPageLabels
  /** Título traducido para cuando el CMS no trae el pilar. */
  fallbackTitle: string
  homeHref: string
}

export default function PilarPage({ result, labels, fallbackTitle, homeHref }: PilarPageProps) {
  const pilar = result.status === 'ok' ? result.pilar : null
  const title = pilar?.titulo ?? fallbackTitle
  const publicada = pilar?.estado === 'publicada' && pilar.contenido

  return (
    <>
      <PageHero
        homeHref={homeHref}
        homeLabel={labels.inicio}
        pageName={title}
        title={title}
        description={publicada ? pilar.descripcion : null}
        titleSize="md"
      />

      <section className="bg-[#F4F7F5] py-16 sm:py-20">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {publicada ? (
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              {pilar.estadisticas.length > 0 && (
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#008000]">{labels.estadisticas}</h2>
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    {pilar.estadisticas.map((m) => (
                      <div key={`${m.etiqueta}-${m.valor}`} className="flex flex-col-reverse rounded-xl border border-[#E3EDE7] bg-white p-5 shadow-sm">
                        <dt className="text-[11px] uppercase tracking-wide text-[#5F6E68]">{m.etiqueta}</dt>
                        <dd className="font-serif text-3xl font-bold text-[#004700]">{m.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <div className="rounded-2xl bg-white p-6 sm:p-10">
                <RichText content={pilar.contenido as never} className="[&>*:first-child]:mt-0" />
              </div>
            </div>
          ) : (
            <div role="status" className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-[#09231D]/10 bg-white px-6 py-12 text-center shadow-[0_16px_36px_-18px_rgba(0,35,0,0.35)] sm:px-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6FFE6] text-[#004700]">
                <PilarIcon icono={pilar?.icono ?? 'birrete'} className="h-8 w-8" />
              </div>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFF4D6] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#7A5400]">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#C98A00]" />
                {labels.enConstruccion}
              </p>
              <p className="mt-5 max-w-[50ch] text-base leading-7 text-[#3E4A45]">{labels.enConstruccionTexto}</p>
              <Link
                href="/"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
              >
                {labels.volver}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
