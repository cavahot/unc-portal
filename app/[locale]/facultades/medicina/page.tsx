// FAC-05: Medicina usa la composición institucional compartida y no conserva catálogos locales.
// Amenaza: evita que el portal publique carreras o aranceles distintos a los editados en Payload.
// Límite: la información que no exista en CMS se muestra como ausente, nunca como dato demo.
import type { Metadata } from 'next'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'

const SLUG = 'facultad-de-medicina'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return facultadMetadata(SLUG, locale)
}

export default async function MedicinaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FacultadView slug={SLUG} locale={locale} />
}
