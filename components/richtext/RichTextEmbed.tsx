// VIDEO-01 (S2, S3): nodos del texto enriquecido que no son texto: imágenes o archivos insertados (`upload`) y el bloque
// «Video de YouTube» (`block` con `blockType: 'youtube'`). Lo usan los dos renderizadores del portal (noticias y páginas).
// Por qué existe: antes ninguno de los dos tenía estos casos y la imagen insertada en el cuerpo desaparecía sin aviso.
// Amenazas que evita: imagen o enlace servidos desde fuera del CMS (todo pasa por `resolveMediaUrl`); `iframe` hacia un
//   origen arbitrario (el `src` se arma desde el identificador validado, con `sandbox`).
// Límite: un nodo sin resolver (solo el id, consulta con `depth` 0) no se dibuja; no hay vista previa de video en el CMS.
import Image from 'next/image'
import React from 'react'
import { resolveMediaUrl } from '@/lib/cms/mediaUrl'
import { safeHref } from '@/lib/security/safeUrl'
import { youTubeEmbedUrl, youTubeIdFromUrl } from '@/lib/video/youtube'

type EmbedNode = { type: string; [key: string]: unknown }

type MediaDoc = {
  url?: unknown
  alt?: unknown
  mimeType?: unknown
  filename?: unknown
  width?: unknown
  height?: unknown
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)

function renderUpload(node: EmbedNode, key: string): React.ReactNode {
  const doc = node.value
  if (!doc || typeof doc !== 'object') return null
  const media = doc as MediaDoc
  const src = resolveMediaUrl(media.url)
  if (!src) return null
  if (!str(media.mimeType).startsWith('image/')) {
    const name = str(media.filename) || decodeURIComponent(src.split('/').pop() || '')
    return (
      <p key={key} className="my-4">
        <a href={safeHref(src)} className="font-semibold text-[#004700] underline underline-offset-4 hover:text-[#005c00]">
          {name}
        </a>
      </p>
    )
  }
  return (
    <figure key={key} className="my-8">
      <Image
        src={src}
        alt={str(media.alt)}
        width={num(media.width) ?? 1600}
        height={num(media.height) ?? 900}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto w-full rounded-xl"
      />
    </figure>
  )
}

function renderYouTube(fields: Record<string, unknown>, key: string): React.ReactNode {
  const id = youTubeIdFromUrl(fields.url)
  if (!id) return null
  return (
    <div key={key} className="my-8 aspect-video overflow-hidden rounded-xl bg-[#09231D]">
      <iframe
        src={youTubeEmbedUrl(id)}
        title={str(fields.title) || 'YouTube'}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  )
}

/**
 * Dibuja un nodo `upload` o un bloque conocido. Devuelve `undefined` si el nodo no es de estos tipos (el llamador sigue con
 * su propio `switch`) y `null` si es de estos tipos pero no se puede mostrar con seguridad.
 */
export function renderEmbed(node: EmbedNode, key: string): React.ReactNode | undefined {
  if (node.type === 'upload') return renderUpload(node, key)
  if (node.type === 'block') {
    const fields = (node.fields && typeof node.fields === 'object' ? node.fields : {}) as Record<string, unknown>
    return fields.blockType === 'youtube' ? renderYouTube(fields, key) : null
  }
  return undefined
}
