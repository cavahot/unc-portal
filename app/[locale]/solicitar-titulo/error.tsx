'use client'

// INST-02: límite de error de /solicitar-titulo. Usa el límite compartido con los textos de esta página
// (`pages.solicitar-titulo`, claves `error.*`). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
import RouteError from '@/components/pages/RouteError'

export default function SolicitarTituloError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.solicitar-titulo" {...props} />
}
