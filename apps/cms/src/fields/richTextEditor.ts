import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { YouTubeBlock } from '../blocks/lexical/YouTube'

// VIDEO-01 (S1): editor de texto enriquecido común (noticias, globals y bloque «Texto» de las páginas).
// Qué hace: las funciones por defecto de Lexical más el bloque «Video de YouTube».
// Por qué existe: un solo lugar para lo que se puede insertar en el cuerpo; el portal solo dibuja lo que conoce.
// Límite: un bloque nuevo aquí necesita su renderizador en `components/richtext/RichTextEmbed.tsx`.
export const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [YouTubeBlock] })],
})
