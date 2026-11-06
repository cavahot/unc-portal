// INST-01: hub «La Institución» conectado al CMS (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md).
// Todo el contenido (quiénes somos con sus datos clave, secciones y valores) sale del global `institucional`; si el
// CMS está vacío o caído se muestra un aviso en línea con una salida (reintentar, contacto), nunca contenido escrito
// en el código ni una ventana modal.
// Errores: la consulta no lanza (estados ok/empty/unavailable) y registra el fallo; un error inesperado de render lo
// recoge `error.tsx` de esta ruta con el mismo estilo del portal.
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import HubSecciones from '@/components/institutional/HubSecciones'
import { getT } from '@/lib/i18n/server'
import { getInstitucional } from '@/lib/cms/queries/institucional'

// ISR: revalida cada 60 s para no hornear el aviso de «no disponible» si el build corre sin CMS alcanzable.
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.institucional')
  const result = await getInstitucional()
  // Con contenido, el título y la descripción son los del CMS (el editor los corrige sin desplegar).
  if (result.status === 'ok') return { title: `${result.data.titulo} | UNC`, description: result.data.descripcion }
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function InstitucionalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.institucional')
  const prefix = locale === 'es' ? '' : `${locale}/`
  const result = await getInstitucional()
  const data = result.status === 'ok' ? result.data : null

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.home')}
        pageName={t('breadcrumb.page')}
        title={data ? data.titulo : t('hero.title')}
        description={data ? data.descripcion : null}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {data ? (
            <div className="flex flex-col gap-20">
              <HubSecciones title={t('sections.title')} intro={t('sections.description')} secciones={data.secciones} prefix={prefix} />

              <section aria-labelledby="inst-sobre" className="rounded-2xl bg-white p-6 sm:p-8 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
                <div>
                  <h2 id="inst-sobre" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                    {data.sobre.titulo}
                  </h2>
                  <p className="mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{data.sobre.texto}</p>
                </div>
                {data.sobre.datos.length > 0 && (
                  <dl aria-label={t('about.dataLabel')} className="mt-8 divide-y divide-[#D7E0DB] lg:mt-0">
                    {data.sobre.datos.map((d) => (
                      <div key={d.etiqueta} className="flex items-baseline justify-between gap-6 py-4 first:pt-0">
                        <dt className="text-base text-[#3E4A45]">{d.etiqueta}</dt>
                        <dd className="text-right text-lg font-semibold tabular-nums text-[#004700]">{d.valor}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              {data.valores.length > 0 && (
                <section aria-labelledby="inst-valores">
                  <h2 id="inst-valores" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                    {t('values.title')}
                  </h2>
                  <ul className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
                    {data.valores.map((v) => (
                      <li key={v.titulo}>
                        <h3 className="text-xl font-bold text-[#004700]">{v.titulo}</h3>
                        <p className="mt-2 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{v.descripcion}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}institucional`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
