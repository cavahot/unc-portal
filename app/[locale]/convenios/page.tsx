// CNV-01: convenios nacionales conectados al CMS (spec docs/specs/portal/CONVENIOS.md).
// La vista es compartida con /convenios/internacionales; el selector de tipo son dos enlaces reales.
import type { Metadata } from 'next'
import ConveniosView, { conveniosMetadata } from '@/components/convenios/ConveniosView'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return conveniosMetadata(locale, 'nacional')
}

export default async function ConveniosNacionalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <ConveniosView locale={locale} type="nacional" />
}
