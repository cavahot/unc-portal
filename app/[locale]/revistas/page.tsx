// INST-08: /revistas en el sistema visual del portal, con las revistas en el CMS (colección `revistas`).
// Estados: `ok`, `empty` (el CMS respondió sin revistas) y `unavailable` (el CMS no respondió): aviso en línea con una salida
// (reintentar solo si no respondió, y Contacto); nunca un modal ni revistas escritas en el código. Antes una caída se
// mostraba como «sin revistas» y la tarjeta traía texto escrito en español («Desde», «Ver revista»).
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import RevistasLista from '@/components/revistas/RevistasLista'
import { getT } from '@/lib/i18n/server'
import { getRevistasCatalogo } from '@/lib/cms/queries/revistasCatalogo'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.revistas')
  return { title: t('pageTitle'), description: t('pageDescription') }
}

export default async function RevistasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.revistas'), getRevistasCatalogo()])
  const prefix = locale === 'es' ? '' : `${locale}/`

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('heading')}
        description={t('subheading')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' ? (
            <RevistasLista
              items={result.docs}
              labels={{
                lista: t('list.label'),
                desde: (year) => t('desde', { year }),
                visitar: t('list.visit'),
                nuevaPestana: t('list.newTab'),
              }}
            />
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}revistas`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
