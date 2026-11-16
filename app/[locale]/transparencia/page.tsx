import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import HubSecciones, { type HubItem } from '@/components/institutional/HubSecciones'
import { getLey5189Page } from '@/lib/cms/queries/ley5189'
import { getLey5282Page } from '@/lib/cms/queries/ley5282'
import { getInformacionPublica } from '@/lib/cms/queries/informacionPublica'
import type { LeyResult } from '@/lib/cms/transparenciaLeyes'
import { getT } from '@/lib/i18n/server'

// TRANS-01 / INST-01: hub de transparencia. Resume las colecciones `ley5189` y `ley5282` (cuántas categorías ya tienen
// documentos, sin enlaces de relleno) y enlaza a «Acceso a la información pública», cuyo título y descripción salen del
// global `informacion-publica`. Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md §5 y
// docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.3.
// Diseño: la misma lista de filas del hub institucional (un enlace por fila), sin tarjetas iguales ni etiqueta sobre el título.
// Errores: cada ley muestra su propio estado («no disponible» / «aún sin documentos»); la consulta de cada ley no lanza,
// y un error inesperado de render lo recoge `error.tsx` de esta ruta.
// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.transparencia')
  return { title: t('pageTitle'), description: t('pageDescription') }
}

type T = (key: string, values?: Record<string, string | number | Date | undefined>) => string

/** Línea de estado de una ley: avance, "aún sin documentos" o "no disponible" (tres casos distintos). */
function statusLine(result: LeyResult, t: T): string {
  if (result.status === 'unavailable') return t('unavailable')
  if (result.status === 'empty') return t('pending')
  return t('progress', { withDocs: result.groups.filter((g) => g.docs.length > 0).length, total: result.groups.length })
}

export default async function TransparenciaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, r5189, r5282, info] = await Promise.all([getT(locale, 'pages.transparencia'), getLey5189Page(), getLey5282Page(), getInformacionPublica()])
  const prefix = locale === 'es' ? '' : `${locale}/`

  const items: HubItem[] = [
    { key: 'ley5189', ruta: '/ley-5189', titulo: t('ley5189.heading'), descripcion: t('ley5189.description'), accion: t('viewLabel'), estado: statusLine(r5189, t) },
    { key: 'ley5282', ruta: '/ley-5282', titulo: t('ley5282.heading'), descripcion: t('ley5282.description'), accion: t('viewLabel'), estado: statusLine(r5282, t) },
    {
      key: 'informacion-publica',
      ruta: '/informacion-publica',
      // Con contenido en el CMS, título y descripción son los del editor; sin él, los textos de la interfaz.
      titulo: info.status === 'ok' ? info.data.titulo : t('infoPublica.heading'),
      descripcion: info.status === 'ok' ? info.data.descripcion : t('infoPublica.description'),
      accion: t('infoPublica.action'),
      estado: info.status === 'ok' ? t('infoPublica.status', { count: info.data.vias.length }) : null,
    },
  ]

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('heading')}
        description={t('description')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <HubSecciones title={t('docs.title')} intro={t('docs.intro')} items={items} prefix={prefix} />
        </div>
      </section>
    </>
  )
}
