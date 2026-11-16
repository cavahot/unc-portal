// BLOQUE-2COL: bloque «Dos columnas» de las páginas del CMS (docs/specs/portal/VIDEO-YOUTUBE-IMAGENES-CUERPO.md §5).
// Qué hace: dibuja el texto enriquecido de cada columna con el mismo renderizado que el cuerpo de las noticias
//   (components/RichText.tsx), así los enlaces pasan por safeHref y las imágenes y videos se ven igual en todo el portal.
// Por qué existe: antes mostraba un aviso fijo («Contenido enriquecido disponible en Payload CMS») y nunca el contenido.
// Límite: una columna sin contenido no se dibuja; si solo queda una, ocupa todo el ancho; sin contenido no hay bloque.
import RichText from '@/components/RichText'

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }
type LexicalDoc = { root?: LexicalNode } | null | undefined

interface TwoColumnBlockProps {
  ratio?: '50-50' | '60-40' | '40-60' | null
  left?: unknown
  right?: unknown
}

const RATIO_CLASS: Record<string, string> = {
  '50-50': 'lg:grid-cols-2',
  '60-40': 'lg:grid-cols-[3fr_2fr]',
  '40-60': 'lg:grid-cols-[2fr_3fr]',
}

/** Indica si un nodo tiene algo visible: texto no vacío o un elemento sin hijos (imagen, video, separador). */
function hasVisible(node: LexicalNode): boolean {
  if (node.type === 'text') return Boolean(node.text?.trim())
  if (node.type === 'linebreak') return false
  if (Array.isArray(node.children)) return node.children.some(hasVisible)
  return true
}

/** Devuelve el documento si tiene contenido visible; el editor guarda un párrafo vacío al borrar todo. */
function visibleDoc(value: unknown): { root: { type: string; children: LexicalNode[] } } | null {
  const root = (value as LexicalDoc)?.root
  if (!root || !Array.isArray(root.children) || !root.children.some(hasVisible)) return null
  return value as { root: { type: string; children: LexicalNode[] } }
}

export default function TwoColumnBlock({ ratio, left, right }: TwoColumnBlockProps) {
  const columns = [visibleDoc(left), visibleDoc(right)].filter((c) => c !== null)
  if (columns.length === 0) return null

  const gridClass = columns.length === 2 ? (RATIO_CLASS[ratio || '50-50'] ?? RATIO_CLASS['50-50']) : ''

  return (
    <section className="py-12 sm:py-16">
      <div className={`mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:gap-14 lg:px-8 ${gridClass}`}>
        {columns.map((content, i) => (
          <div key={i} data-columna className="min-w-0">
            {/* Sin margen superior en el primer elemento: un título al inicio no desalinea las columnas. */}
            <RichText content={content as never} className="[&>*:first-child]:mt-0" />
          </div>
        ))}
      </div>
    </section>
  )
}
