'use client'

// INST-08: límite de error de /revistas. Un error inesperado de render llega aquí con el estilo del portal, en lugar de la
// pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.revistas`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function RevistasError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.revistas" {...props} />
}
