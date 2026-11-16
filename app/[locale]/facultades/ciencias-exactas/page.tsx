// FAC-06: contenedor de Ciencias Exactas conectado al CMS compartido.
// Qué hace: delega carreras, aranceles, contacto y decanato a FacultadView.
// Amenaza: elimina la segunda fuente local que podía mostrar datos demo o desactualizados.
// Límite: si una fila no existe en CMS, se muestra la ausencia editorial; no se inventan valores.
import type { Metadata } from 'next'
import FacultadView, { facultadMetadata } from '@/components/facultades/FacultadView'

/** Slug natural de Payload para la Facultad de Ciencias Exactas y Tecnológicas. */
const SLUG = 'facultad-de-ciencias-exactas-y-tecnologicas'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return facultadMetadata(SLUG, locale)
}

export default async function CienciasExactasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FacultadView slug={SLUG} locale={locale} />
}
