// DEP-15: los href que provienen del CMS pasan por safeHref (bloquea javascript:/data:).
import { safeHref } from '@/lib/security/safeUrl'
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
  if (format & 16) node = <code className="rounded bg-[#E3EDE7] px-1 py-0.5 font-mono text-sm text-[#09231D]">{node}</code>
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
        h1: 'mb-6 mt-10 font-serif text-3xl font-bold tracking-[-0.02em] text-[#004700]',
        h2: 'mb-4 mt-10 font-serif text-2xl font-bold tracking-[-0.02em] text-[#004700]',
        h3: 'mb-3 mt-8 font-serif text-xl font-bold text-[#004700]',
        h4: 'mb-2 mt-6 text-lg font-bold text-[#09231D]',
        h5: 'mb-2 mt-6 text-base font-bold text-[#09231D]',
        h6: 'mb-2 mt-6 text-sm font-bold text-[#09231D]',
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
      return <blockquote key={key} className="my-4 border-l-4 border-[#00A300] pl-4 italic text-[#3E4A45]">{children}</blockquote>
    case 'link': {
      const href = safeHref(el.url)
      const ext = href.startsWith('http')
      return (
        <a key={key} href={href} className="rounded-sm font-semibold text-[#004700] underline underline-offset-4 hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
          {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {children}
        </a>
      )
    }
    case 'horizontalrule':
      return <hr key={key} className="my-8 border-[#D7E0DB]" />
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
    <div className={`text-lg leading-8 text-[#1F2D27] ${className}`}>
      {content.root.children.map((node, i) => renderNode(node, i))}
    </div>
  )
}
