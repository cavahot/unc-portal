'use client'

// INST-10: límite de error de /buscar. Un error inesperado de render llega aquí con el estilo del portal, en lugar de la
// pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.buscar`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function BuscarError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.buscar" {...props} />
}
