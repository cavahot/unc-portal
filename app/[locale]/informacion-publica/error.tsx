'use client'

// INST-01: límite de error de /informacion-publica. Usa el límite compartido con los textos de esta página
// (`pages.informacion-publica`, claves `error.*`). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
import RouteError from '@/components/pages/RouteError'

export default function InformacionPublicaError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.informacion-publica" {...props} />
}
