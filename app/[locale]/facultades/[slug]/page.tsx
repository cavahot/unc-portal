// FAC-05: ruta dinámica de facultad (`/facultades/<slug-del-cms>`). Antes pintaba una página propia en estilo oscuro,
// distinta de la de cada facultad. Ahora hace dos cosas:
//  1. Si el slug del CMS tiene página propia (lista cerrada `FACULTAD_RUTA`), redirige de forma permanente a esa ruta
//     pública: así los enlaces ya publicados (listado y mapa del sitio con el slug largo) no se rompen y no queda
//     contenido duplicado en dos direcciones.
//  2. Si no la tiene (una facultad nueva cargada en el CMS), la pinta con `FacultadView`, el mismo diseño de las demás.
// Un slug que no existe en el CMS da 404 (lo decide `FacultadView`). Sin datos de demostración.
import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'
import { segmentoPropio } from '@/lib/cms/facultadRutas'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  return facultadMetadata(slug, locale)
}

export default async function FacultadDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const propio = segmentoPropio(slug)
  if (propio) permanentRedirect(`/${locale === 'es' ? '' : `${locale}/`}facultades/${propio}`)
  return <FacultadView slug={slug} locale={locale} />
}
