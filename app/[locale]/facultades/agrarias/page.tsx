// FAC-02: página de la Facultad de Ciencias Agrarias, 100 % desde el CMS (spec docs/specs/portal/FACULTADES.md).
// Antes tenía aranceles y carreras de demostración escritos en el código; ahora es un contenedor fino sobre
// FacultadView (mismo patrón que Odontología). Si el CMS no responde o no tiene datos, se muestra un aviso honesto.
import type { Metadata } from 'next'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

/** Slug de la facultad en el CMS (colección `facultades`); la URL pública conserva `/facultades/agrarias`. */
const SLUG = 'facultad-de-ciencias-agrarias'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return facultadMetadata(SLUG, locale)
}

export default async function AgrariasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FacultadView slug={SLUG} locale={locale} />
}
