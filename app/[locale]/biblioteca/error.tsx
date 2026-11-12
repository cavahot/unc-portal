'use client'

// INST-06: límite de error de /biblioteca. Un error inesperado de render llega aquí con el estilo del portal, en lugar de la
// pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.biblioteca`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function BibliotecaError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.biblioteca" {...props} />
}
