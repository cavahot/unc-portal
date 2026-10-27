// FAC-01: banda fotográfica bajo la cabecera. Usa la imagen de portada de la facultad cargada en el CMS (`imagen`);
// si no hay, la vista aérea del campus de la UNC (archivo del proyecto), con un pie que dice qué es: la dirección de
// la facultad publicada por la UNC es el Campus Universitario (Ruta PY05, km 210). Nunca se presenta como foto
// propia de la facultad (no se inventa una imagen del edificio).
import Image from 'next/image'

export interface FacultadFotoProps {
  /** Foto propia de la facultad (del CMS, URL ya resuelta). */
  imagen?: { url: string; alt?: string }
  fallback: { src: string; alt: string; caption: string }
  altPropia: string
}

export default function FacultadFoto({ imagen, fallback, altPropia }: FacultadFotoProps) {
  const src = imagen?.url ?? fallback.src
  const alt = imagen ? (imagen.alt ?? altPropia) : fallback.alt
  return (
    <figure className="bg-[#F4F7F5] print:hidden">
      <div className="mx-auto max-w-[1260px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-[#004700] sm:aspect-[21/9]">
          <Image src={src} alt={alt} fill sizes="(min-width: 1260px) 1196px, 100vw" className="fac-drift object-cover object-[50%_42%]" />
        </div>
        {!imagen && <figcaption className="mt-3 text-sm text-[#3E4A45]">{fallback.caption}</figcaption>}
      </div>
    </figure>
  )
}
