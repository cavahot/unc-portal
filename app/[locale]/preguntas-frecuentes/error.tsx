'use client'

// Límite de error de /preguntas-frecuentes: un error inesperado de render llega aquí con el estilo del portal, en lugar de
// la pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.preguntas-frecuentes`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function PreguntasFrecuentesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.preguntas-frecuentes" {...props} />
}
