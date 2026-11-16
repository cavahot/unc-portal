import type { Block } from 'payload'
import { validateYouTubeUrl } from '../../utilities/youtube'

// VIDEO-01 (S1): bloque «Video de YouTube» dentro del texto enriquecido.
// Qué hace: guarda el enlace que pega quien edita (validado) y un título, que es el nombre accesible del reproductor.
// Por qué existe: los videos se alojan en YouTube y no en Medios (pesan cientos de MB; Medios admite hasta 10 MB).
// Límite: el panel no muestra vista previa del video; el portal lo incrusta desde youtube-nocookie.com.
export const YouTubeBlock: Block = {
  slug: 'youtube',
  labels: { singular: 'Video de YouTube', plural: 'Videos de YouTube' },
  fields: [
    {
      name: 'url',
      type: 'text',
      label: 'Enlace del video',
      required: true,
      validate: (value: unknown) => validateYouTubeUrl(value),
      admin: { description: 'Por ejemplo, https://www.youtube.com/watch?v=… o https://youtu.be/…' },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Título del video',
      required: true,
      maxLength: 150,
      admin: { description: 'Lo leen los lectores de pantalla. Describa el video en pocas palabras.' },
    },
  ],
}
