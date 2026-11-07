// FAC-05: listado /facultades en el sistema visual del portal (cabecera compartida, lista de filas, aviso en línea).
// Las facultades y su conteo de carreras salen del CMS (`getFacultadesLista`); si el CMS no responde o no tiene
// facultades se muestra un aviso en línea con una salida (reintentar y contacto), nunca nombres escritos en el código ni
// un modal. Cada fila enlaza a la página de la facultad por la ruta pública única (`rutaFacultad`), la misma del menú.
// Errores: la consulta no lanza (estados ok/empty/unavailable); un error inesperado de render lo recoge `error.tsx`.
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import HubSecciones, { type HubItem } from '@/components/institutional/HubSecciones'
import { getT } from '@/lib/i18n/server'
import { getFacultadesLista } from '@/lib/cms/queries/facultadesLista'
import { rutaFacultad } from '@/lib/cms/facultadRutas'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.facultades')
  return { title: t('pageTitle'), description: t('pageDescription') }
}

export default async function FacultadesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.facultades'), getFacultadesLista()])
  const prefix = locale === 'es' ? '' : `${locale}/`

  const items: HubItem[] =
    result.status === 'ok'
      ? result.facultades.map((f) => ({
          key: f.slug,
          ruta: rutaFacultad(f.slug),
          titulo: f.nombre,
          descripcion: f.descripcion ?? '',
          accion: t('verCarreras'),
          // El conteo solo se muestra si se pudo calcular y es mayor que cero (nunca un «0 carreras» inventado).
          estado: f.carreras ? t('carrerasCount', { count: f.carreras }) : null,
        }))
      : []

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
            <HubSecciones title={t('lista.title')} intro={t('lista.intro')} items={items} prefix={prefix} />
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}facultades`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
