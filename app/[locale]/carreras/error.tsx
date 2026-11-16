'use client'

// INST-04: límite de error de /carreras y de /carreras/[slug]. Una caída del CMS al leer una carrera (DEP-15: no se
// cachea como 404) llega aquí en lugar de a la pantalla de error global. Usa el límite compartido con los textos de
// esta página (`pages.carreras`, claves `error.*`). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
import RouteError from '@/components/pages/RouteError'

export default function CarrerasError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.carreras" {...props} />
}
