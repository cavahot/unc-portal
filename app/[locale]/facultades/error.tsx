'use client'

// FAC-05: límite de error de /facultades (listado). Usa el límite compartido con los textos de esta página
// (`pages.facultades`, claves `error.*`). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
import RouteError from '@/components/pages/RouteError'

export default function FacultadesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.facultades" {...props} />
}
