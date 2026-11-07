// FAC-04: Humanidades usa la misma ruta de datos y composición CMS que Odontología.
// Decisión: el contenido académico, aranceles, contacto y decanato salen de Payload; la edición queda centralizada.
// Amenaza que evita: mantener catálogos locales divergentes de la base de datos institucional.
// Límite: si un dato no está publicado o verificado en el CMS, FacultadView muestra el estado vacío y no inventa valores.
import type { Metadata } from 'next'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'

/** Slug relacional de Payload para la Facultad de Humanidades y Ciencias de la Educación. */
const SLUG = 'facultad-de-humanidades-y-ciencias-de-la-educacion'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return facultadMetadata(SLUG, locale)
}

export default async function HumanidadesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FacultadView slug={SLUG} locale={locale} />
}