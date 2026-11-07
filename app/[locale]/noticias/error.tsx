'use client'

// INST-03: límite de error de /noticias y de /noticias/[slug]. Una caída del CMS al leer una noticia (DEP-15: no se
// cachea como 404) llega aquí en lugar de a la pantalla de error global. Usa el límite compartido con los textos de
// esta página (`pages.noticias`, claves `error.*`). Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
import RouteError from '@/components/pages/RouteError'

export default function NoticiasError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.noticias" {...props} />
}
