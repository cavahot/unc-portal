import React from 'react'

type TextNode = {
  type: 'text'
  text: string
  format?: number
}

type ElementNode = {
  type: string
  tag?: string
  url?: string
  children?: LexicalNode[]
}

type LexicalNode = TextNode | ElementNode

function applyFormat(text: string, format: number): React.ReactNode {
  let node: React.ReactNode = text
  if (format & 1) node = <strong>{node}</strong>
  if (format & 2) node = <em>{node}</em>
  if (format & 4) node = <s>{node}</s>
  if (format & 8) node = <u>{node}</u>
  if (format & 16) node = <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-sm">{node}</code>
  if (format & 32) node = <sub>{node}</sub>
  if (format & 64) node = <sup>{node}</sup>
  return node
}

function renderNode(node: LexicalNode, key: number): React.ReactNode {
  if ('text' in node) {
    if (!node.text) return null
    return <React.Fragment key={key}>{applyFormat(node.text, node.format || 0)}</React.Fragment>
  }

  const el = node as ElementNode
  const children = (el.children || []).map((c, i) => renderNode(c, i))

  switch (el.type) {
    case 'paragraph':
      return <p key={key} className="mb-4 leading-relaxed">{children}</p>
    case 'heading': {
      const sizes: Record<string, string> = {
        h1: 'mb-6 text-3xl font-bold text-white',
        h2: 'mb-4 text-2xl font-semibold text-white',
        h3: 'mb-3 text-xl font-semibold text-white',
        h4: 'mb-2 text-lg font-semibold text-white',
        h5: 'mb-2 text-base font-semibold text-white',
        h6: 'mb-2 text-sm font-semibold text-white',
      }
      return React.createElement(el.tag || 'h2', { key, className: sizes[el.tag || 'h2'] || '' }, children)
    }
    case 'list':
      return el.tag === 'ol'
        ? <ol key={key} className="mb-4 ml-6 list-decimal">{children}</ol>
        : <ul key={key} className="mb-4 ml-6 list-disc">{children}</ul>
    case 'listitem':
      return <li key={key} className="mb-1">{children}</li>
    case 'quote':
      return <blockquote key={key} className="my-4 border-l-4 border-[#5CFF5C] pl-4 italic text-white/60">{children}</blockquote>
    case 'link': {
      const href = el.url || '#'
      const ext = href.startsWith('http')
      return (
        <a key={key} href={href} className="text-[#5CFF5C] underline hover:text-[#8AFF8A]"
          {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {children}
        </a>
      )
    }
    case 'horizontalrule':
      return <hr key={key} className="my-6 border-white/20" />
    case 'linebreak':
      return <br key={key} />
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>
  }
}

interface RichTextProps {
  content: { root: ElementNode }
  className?: string
}

export default function RichText({ content, className = '' }: RichTextProps) {
  if (!content?.root?.children) return null
  return (
    <div className={`text-white/80 ${className}`}>
      {content.root.children.map((node, i) => renderNode(node, i))}
    </div>
  )
}
