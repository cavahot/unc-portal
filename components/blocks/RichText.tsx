// ── Types ──────────────────────────────────────────────────────────────

type LexicalNode = Record<string, unknown> & { type: string; children?: LexicalNode[] }

interface RichTextBlockProps {
  content?: {
    root?: {
      children?: LexicalNode[]
    }
  } | null
}

// ── Text format bitmask ────────────────────────────────────────────────
// 1 = bold · 2 = italic · 4 = strikethrough · 8 = underline · 16 = code

function applyFormat(text: string, format: number): React.ReactNode {
  let node: React.ReactNode = text
  if (format & 16) node = <code className="rounded bg-[#E6FFE6] px-1.5 py-0.5 font-mono text-[0.875em] text-[#004700]">{node}</code>
  if (format & 4)  node = <s>{node}</s>
  if (format & 8)  node = <u>{node}</u>
  if (format & 2)  node = <em>{node}</em>
  if (format & 1)  node = <strong className="font-semibold text-[#09231D]">{node}</strong>
  return node
}

// ── Node serializer ────────────────────────────────────────────────────

function serializeNode(node: LexicalNode, key: string): React.ReactNode {
  const children = node.children
    ? node.children.map((child, i) => serializeNode(child, `${key}-${i}`))
    : null

  switch (node.type) {
    case 'text': {
      const text   = (node.text as string) || ''
      const format = (node.format as number) || 0
      if (!text) return null
      return <span key={key}>{applyFormat(text, format)}</span>
    }

    case 'linebreak':
      return <br key={key} />

    case 'paragraph':
      if (!children || children.every(c => c === null)) return null
      return (
        <p key={key} className="mt-0 leading-7 text-[#4A5C52] first:mt-0">
          {children}
        </p>
      )

    case 'heading': {
      const tag = (node.tag as string) || 'h2'
      const headingClass = {
        h1: 'mt-10 font-serif text-3xl font-bold tracking-[-0.025em] text-[#09231D] sm:text-4xl',
        h2: 'mt-10 font-serif text-2xl font-bold tracking-[-0.02em] text-[#09231D] sm:text-3xl',
        h3: 'mt-8 font-serif text-xl font-bold text-[#09231D]',
        h4: 'mt-6 font-serif text-lg font-semibold text-[#09231D]',
        h5: 'mt-6 text-base font-semibold text-[#09231D]',
        h6: 'mt-4 text-sm font-semibold uppercase tracking-wide text-[#6C7B76]',
      }[tag] || ''

      const Tag = tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      return <Tag key={key} className={headingClass}>{children}</Tag>
    }

    case 'list': {
      const listType = (node.listType as string) || 'bullet'
      const cls = 'mt-4 space-y-2 pl-6 text-[#4A5C52]'
      if (listType === 'number') {
        return <ol key={key} className={`${cls} list-decimal`}>{children}</ol>
      }
      return <ul key={key} className={`${cls} list-disc`}>{children}</ul>
    }

    case 'listitem':
      return (
        <li key={key} className="leading-7 marker:text-[#008000]">
          {children}
        </li>
      )

    case 'quote':
      return (
        <blockquote
          key={key}
          className="mt-6 border-l-4 border-[#37D448] pl-5 text-[#4A5C52] italic"
        >
          {children}
        </blockquote>
      )

    case 'link': {
      const url = (node.url as string) || '#'
      const isExternal = url.startsWith('http')
      return (
        <a
          key={key}
          href={url}
          className="font-medium text-[#008000] underline underline-offset-2 transition-colors hover:text-[#004700]"
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    }

    case 'horizontalrule':
      return <hr key={key} className="my-8 border-[#D7E0DB]" />

    default:
      return children ? <>{children}</> : null
  }
}

// ── Component ──────────────────────────────────────────────────────────

export default function RichTextBlock({ content }: RichTextBlockProps) {
  const children = content?.root?.children

  if (!children || children.length === 0) return null

  const nodes = children.map((node, i) => serializeNode(node as LexicalNode, `n-${i}`))

  return (
    <section className="bg-[#F4F7F5] py-16 sm:py-20">
      <div className="mx-auto max-w-[780px] px-5 sm:px-6 lg:px-8">
        <div className="space-y-4 text-base">
          {nodes}
        </div>
      </div>
    </section>
  )
}
