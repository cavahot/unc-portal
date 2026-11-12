// PILARES-01 (S4): página del pilar «investigacion». Contenido desde el global `pilares-academicos` del CMS; mientras esté
// «en construcción» solo se muestra el aviso. Spec: docs/specs/portal/PILARES-ACADEMICOS.md.
import { PilarRoute, pilarMetadata } from '@/components/pilares/pilarRoute'

// ISR: revalida cada 60 s para no hornear el aviso si el build corre sin CMS; las etiquetas lo acortan.
export const revalidate = 60

export const generateMetadata = pilarMetadata('investigacion')

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <PilarRoute params={params} pilar="investigacion" />
}
