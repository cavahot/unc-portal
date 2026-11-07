// INST-01: página pública «Acceso a la información pública» conectada al CMS (spec docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md).
// Todo el contenido (vías, datos requeridos, cita de la Ley N° 5282, portal oficial y correo) sale del global
// `informacion-publica`; si el CMS está vacío o caído se muestra un aviso en línea con una salida (reintentar,
// contacto), nunca contenido escrito en el código ni una ventana modal.
// Errores: la consulta no lanza (estados ok/empty/unavailable) y registra el fallo; un error inesperado de render lo
// recoge `error.tsx` de esta ruta con el mismo estilo del portal.
import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import ViasSolicitud from '@/components/informacion-publica/ViasSolicitud'
import DatosRequeridos from '@/components/informacion-publica/DatosRequeridos'
import { getT } from '@/lib/i18n/server'
import { getInformacionPublica } from '@/lib/cms/queries/informacionPublica'
import { safeHref } from '@/lib/security/safeUrl'

// ISR: revalida cada 60 s para no hornear el aviso de «no disponible» si el build corre sin CMS alcanzable.
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.informacion-publica')
  const result = await getInformacionPublica()
  // Con contenido, el título y la descripción son los del CMS (el editor los corrige sin desplegar).
  if (result.status === 'ok') return { title: `${result.data.titulo} | UNC`, description: result.data.descripcion }
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function InformacionPublicaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.informacion-publica')
  const prefix = locale === 'es' ? '' : `${locale}/`
  const result = await getInformacionPublica()
  const data = result.status === 'ok' ? result.data : null

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={data ? data.titulo : t('hero.titulo')}
        description={data ? data.descripcion : null}
        note={data ? data.leyReferencia : null}
        aside={
          data && (
            // Firma de la página: el índice de vías es la acción principal (elegir cómo solicitar).
            <nav aria-labelledby="info-index" className="print:hidden">
              <p id="info-index" className="mb-3 text-sm font-semibold text-white/80">
                {t('index.label')}
              </p>
              <ul className="flex flex-col gap-2">
                {data.vias.map((via) => (
                  <li key={via.slug}>
                    <a
                      href={`#via-${via.slug}`}
                      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl bg-white/[0.09] px-6 py-4 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                    >
                      <span className="text-base font-semibold text-white group-hover:text-[#004700]">{via.titulo}</span>
                      <span className="text-sm text-white/75 group-hover:text-[#004700]/75">{via.etiqueta}</span>
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
          {data ? (
            <div className="flex flex-col gap-20">
              <ViasSolicitud
                title={t('vias.title')}
                intro={t('vias.intro')}
                vias={data.vias}
                recommended={t('vias.recommended')}
                newTab={t('newTab')}
                prefix={prefix}
              />

              {data.datosRequeridos.length > 0 && (
                <DatosRequeridos
                  title={t('datos.title')}
                  intro={t('datos.intro')}
                  listLabel={t('datos.listLabel')}
                  datos={data.datosRequeridos}
                  correoTitle={t('correo.title')}
                  correoBody={t('correo.body')}
                  correo={data.correo}
                />
              )}

              {data.cita && (
                <figure className="mx-auto max-w-[65ch] text-center">
                  <blockquote className="font-serif text-xl leading-8 text-[#09231D] sm:text-2xl sm:leading-9">{data.cita.texto}</blockquote>
                  {data.cita.fuente && <figcaption className="mt-4 text-sm font-semibold text-[#3E4A45]">{data.cita.fuente}</figcaption>}
                </figure>
              )}

              {data.portalOficial && (
                <aside className="rounded-2xl bg-[#004700] p-8 text-white sm:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
                  <div>
                    <h2 className="font-serif text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{data.portalOficial.titulo}</h2>
                    {data.portalOficial.descripcion && <p className="mt-3 max-w-[65ch] text-base leading-7 text-white/85">{data.portalOficial.descripcion}</p>}
                    <p className="mt-3 text-sm text-white/75">{t('portal.redirect')}</p>
                  </div>
                  <a
                    href={safeHref(data.portalOficial.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white lg:mt-0"
                  >
                    {t('portal.open')}
                    <span className="sr-only"> {t('newTab')}</span>
                  </a>
                </aside>
              )}
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}informacion-publica`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>

      <section className="bg-white py-14 print:hidden">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <p className="text-base text-[#3E4A45]">
            {t('related.text')}{' '}
            <Link
              href={`/${prefix}transparencia`}
              className="rounded-sm font-semibold text-[#004700] underline underline-offset-4 transition-colors hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
            >
              {t('related.link')}
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
