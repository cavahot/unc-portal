'use client'

// INST-05: límite de error de /tramites. Un error inesperado de render llega aquí con el estilo del portal, en lugar de
// la pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.tramites`, claves `error.*`).
// Spec: docs/specs/portal/TRAMITES.md §2.6.
import RouteError from '@/components/pages/RouteError'

export default function TramitesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.tramites" {...props} />
}
