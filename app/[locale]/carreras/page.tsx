// INST-04: catálogo /carreras en el sistema visual del portal (cabecera compartida, secciones por facultad, aviso en línea).
// Las carreras salen del CMS (`getCarreras`). Estados: `ok`, `empty` (el CMS respondió sin carreras) y `unavailable`
// (el CMS no respondió): antes una caída llegaba a la pantalla de error global y no había «vacío» honesto. Ahora ambos son
// un aviso en línea (con «Intentar de nuevo» solo si no respondió); nunca un modal ni carreras escritas en el código.
// Firma de la página: un índice de facultades en la cabecera (62 programas se recorren por facultad, no de corrido).
// Las facultades se enlazan con la ruta pública única (`rutaFacultad`), la misma del menú.
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import CarrerasPorFacultad from '@/components/carreras/CarrerasPorFacultad'
import { getT } from '@/lib/i18n/server'
import { getCarreras } from '@/lib/cms/queries/carreras'
import { agruparPorFacultad } from '@/lib/cms/carrerasCatalogo'
import { CmsError } from '@/lib/cms/errors'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.carreras')
  return { title: t('pageTitle'), description: t('pageDescription') }
}

export default async function CarrerasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.carreras')
  const prefix = locale === 'es' ? '' : `${locale}/`

  let rows: unknown = []
  let unavailable = false
  try {
    rows = await getCarreras()
  } catch (error) {
    // Se registra el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS).
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[CARRERAS] No se pudo leer el CMS (${detail}); se muestra el aviso de no disponible.`)
    unavailable = true
  }
  const grupos = unavailable ? [] : agruparPorFacultad(rows)
  const totalProgramas = grupos.reduce((n, g) => n + g.total, 0)
  const conFacultad = grupos.filter((g) => g.facultad)

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('heading')}
        description={t('subheading')}
        note={grupos.length > 0 ? t('summary', { programs: totalProgramas, faculties: conFacultad.length }) : null}
        aside={
          conFacultad.length > 1 && (
            <nav aria-labelledby="carreras-index" className="print:hidden">
              <p id="carreras-index" className="mb-3 text-sm font-semibold text-white/80">
                {t('index.label')}
              </p>
              <ul className="flex flex-col gap-2">
                {conFacultad.map((g) => (
                  <li key={g.key}>
                    <a
                      href={`#fac-${g.key}`}
                      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl bg-white/[0.09] px-5 py-3 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                    >
                      <span className="text-base font-semibold text-white group-hover:text-[#004700]">{g.facultad!.nombre}</span>
                      <span className="text-sm tabular-nums text-white/75 group-hover:text-[#004700]/75">{g.total}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )
        }
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {grupos.length > 0 ? (
            <CarrerasPorFacultad
              grupos={grupos}
              prefix={prefix}
              labels={{
                verFacultad: t('verFacultad'),
                sinFacultad: t('sinFacultad'),
                tipos: { grado: t('tipos.grado'), posgrado: t('tipos.posgrado'), otros: t('tipos.otros') },
                sede: t('sede'),
                modalidad: t('modalidad'),
                duracion: (n) => t('duracion', { count: n }),
                action: t('verDetalle'),
              }}
            />
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(unavailable ? 'states.unavailable' : 'empty')}
              retry={unavailable ? { href: `/${prefix}carreras`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
