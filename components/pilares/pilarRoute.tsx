// PILARES-01 (S4): piezas comunes de las rutas /docencia, /investigacion y /extension.
// Qué hace: arma los metadatos y la página de un pilar con el contenido del global `pilares-academicos`; los textos de
//   la interfaz salen de messages/<idioma>/pages.pilares.json. Por qué: las tres rutas son iguales salvo la clave.
// Límite: el contenido del CMS es solo en español.
import type { Metadata } from 'next'
import PilarPage from '@/components/pilares/PilarPage'
import { getT } from '@/lib/i18n/server'
import { getPilar } from '@/lib/cms/queries/pilares'
import type { PilarKey } from '@/lib/cms/pilares'

type Params = { params: Promise<{ locale: string }> }

/** Metadatos: con el pilar publicado, título y descripción del CMS; si no, los textos traducidos. */
export function pilarMetadata(key: PilarKey) {
  return async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params
    const t = await getT(locale, 'pages.pilares')
    const result = await getPilar(key, locale)
    if (result.status === 'ok' && result.pilar.estado === 'publicada') {
      return { title: result.pilar.titulo, description: result.pilar.descripcion }
    }
    return { title: t(`meta.${key}.title`), description: t(`meta.${key}.description`) }
  }
}

export async function PilarRoute({ params, pilar }: Params & { pilar: PilarKey }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.pilares')
  const result = await getPilar(pilar, locale)
  return (
    <PilarPage
      result={result}
      fallbackTitle={t(`titulos.${pilar}`)}
      homeHref={`/${locale === 'es' ? '' : locale}`}
      labels={{
        inicio: t('inicio'),
        enConstruccion: t('enConstruccion'),
        enConstruccionTexto: t('enConstruccionTexto'),
        volver: t('volver'),
        estadisticas: t('estadisticas'),
      }}
    />
  )
}
