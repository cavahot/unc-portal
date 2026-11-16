// FAC-07: Ciencias Económicas usa el contenedor institucional compartido.
// Qué hace: obtiene carreras, decanato, contacto y aranceles desde Payload mediante FacultadView.
// Amenaza: evita que esta ruta vuelva a divergir por catálogos o estilos locales hardcodeados.
// Límite: si el CMS no tiene un dato, FacultadView muestra el estado vacío; no inventa fallback editorial.
import type { Metadata } from 'next'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'

const SLUG = 'facultad-de-ciencias-economicas-y-administrativas'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return facultadMetadata(SLUG, locale)
}

export default async function CienciasEconomicasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FacultadView slug={SLUG} locale={locale} />
}
