// INST-08: /privacidad en el sistema visual del portal, con el texto en el CMS (global `politica-privacidad`, un texto por
// idioma). Spec: docs/specs/portal/LEGALES.md §2.8. Antes el texto estaba escrito en los archivos de mensajes y la página usaba
// el estilo oscuro anterior.
// Estados: `ok`, `empty` (el CMS respondió sin secciones) y `unavailable` (el CMS no respondió): aviso en línea con una salida
// (reintentar solo si no respondió, y Contacto); nunca texto legal escrito en el código ni un modal. Si el idioma pedido no
// tiene texto, se muestra el español con un aviso para que no se confunda con una traducción.
// Firma de la página: un índice de las secciones en la cabecera (la política se lee por secciones, no de corrido).
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import { getT } from '@/lib/i18n/server'
import { getPoliticaPrivacidad } from '@/lib/cms/queries/legales'
import { formatMesAnio, paragraphs } from '@/lib/cms/legales'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.privacidad')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function PrivacidadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.privacidad'), getPoliticaPrivacidad(locale)])
  const prefix = locale === 'es' ? '' : `${locale}/`
  const data = result.status === 'ok' ? result.data : null

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={t('hero.description')}
        note={data?.actualizacion ? t('updated', { date: formatMesAnio(data.actualizacion, locale) }) : null}
        aside={
          data && data.secciones.length > 1 ? (
            <nav aria-labelledby="privacidad-toc" className="print:hidden">
              <p id="privacidad-toc" className="mb-3 text-sm font-semibold text-white/80">
                {t('toc')}
              </p>
              <ol className="flex flex-col gap-2">
                {data.secciones.map((s, i) => (
                  <li key={i}>
                    <a
                      href={`#seccion-${i + 1}`}
                      className="group grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 rounded-2xl bg-white/[0.09] px-5 py-3 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] motion-reduce:transition-none"
                    >
                      <span className="text-sm tabular-nums text-white/75 group-hover:text-[#004700]/75">{i + 1}</span>
                      <span className="text-base font-semibold text-white group-hover:text-[#004700]">{s.titulo}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : undefined
        }
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {data && result.status === 'ok' ? (
            <div className="max-w-[72ch]">
              {result.fallback && (
                <p role="note" className="mb-10 rounded-2xl border border-[#D7E0DB] bg-white px-6 py-4 text-base leading-7 text-[#3E4A45]">
                  {t('fallbackNotice')}
                </p>
              )}
              <div className="flex flex-col gap-12">
                {data.secciones.map((s, i) => (
                  <section key={i} id={`seccion-${i + 1}`} aria-labelledby={`seccion-titulo-${i + 1}`} className="scroll-mt-24">
                    <h2 id={`seccion-titulo-${i + 1}`} className="font-serif text-2xl font-bold tracking-[-0.02em] text-[#004700] sm:text-3xl">
                      {s.titulo}
                    </h2>
                    <div className="mt-4 flex flex-col gap-4">
                      {paragraphs(s.contenido).map((p, j) => (
                        <p key={j} className="text-base leading-7 text-[#1F2D27]">
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}privacidad`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
