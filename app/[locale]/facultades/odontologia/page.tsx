// FAC-01: página de la Facultad de Odontología, 100 % desde el CMS (spec docs/specs/portal/FACULTADES.md).
// Antes tenía 28 aranceles y 9 carreras de demostración escritos en el código (F1-F2 de la spec); ahora es un
// contenedor fino sobre FacultadView, reutilizable por las otras cinco facultades cambiando solo el slug.
import type { Metadata } from 'next'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'

/** Slug de la facultad en el CMS (colección `facultades`); la URL pública conserva `/facultades/odontologia`. */
const SLUG = 'facultad-de-odontologia'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return facultadMetadata(SLUG, locale)
}

export default async function OdontologiaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FacultadView slug={SLUG} locale={locale} />
}
