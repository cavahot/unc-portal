// CNV-01: convenios internacionales conectados al CMS (spec docs/specs/portal/CONVENIOS.md).
// Misma vista que /convenios con `type="internacional"`: URL propia, compartible y sin depender de JS.
import type { Metadata } from 'next'
import ConveniosView, { conveniosMetadata } from '@/components/convenios/ConveniosView'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return conveniosMetadata(locale, 'internacional')
}

export default async function ConveniosInternacionalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <ConveniosView locale={locale} type="internacional" />
}
