'use client'

// INST-07: límite de error de /calendario-academico. Un error inesperado de render llega aquí con el estilo del portal, en
// lugar de la pantalla de error global. Usa el límite compartido con los textos de esta página
// (`pages.calendario-academico`, claves `error.*`). Spec: docs/specs/portal/CALENDARIO.md §2.6.
import RouteError from '@/components/pages/RouteError'

export default function CalendarioAcademicoError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.calendario-academico" {...props} />
}
