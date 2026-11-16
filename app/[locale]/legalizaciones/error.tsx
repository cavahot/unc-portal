'use client'

// INST-11: límite de error de /legalizaciones. Un error inesperado de render llega aquí con el estilo del portal, en lugar de
// la pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.legalizaciones`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function LegalizacionesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.legalizaciones" {...props} />
}
