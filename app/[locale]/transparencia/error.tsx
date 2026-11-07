'use client'

// INST-01: límite de error de /transparencia. Usa el límite compartido con los textos de esta página
// (`pages.transparencia`, claves `error.*`). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
import RouteError from '@/components/pages/RouteError'

export default function TransparenciaError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.transparencia" {...props} />
}
