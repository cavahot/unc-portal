import NewsGallery from '@/components/news/NewsGallery'

// Temporary demo page — delete after reviewing the gallery component
// Visit: http://localhost:3001/gallery-demo

const DEMO_IMAGES = [
  {
    url: 'https://www.unc.edu.py/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-24-at-11.15.42-1.jpeg',
    alt: 'Presentación del Mecanismo Piloto',
    caption: 'Autoridades universitarias en la presentación oficial',
    blurDataURL: null,
  },
  {
    url: 'https://www.unc.edu.py/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-24-at-10.43.01-1024x682.jpeg',
    alt: 'Jornada institucional',
    caption: 'Representantes de la UNC en el acto académico',
    blurDataURL: null,
  },
  {
    url: 'https://www.unc.edu.py/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-15-at-20.45.50-1024x683.jpeg',
    alt: 'Reunión institucional',
    caption: 'Encuentro interinstitucional de autoridades académicas',
    blurDataURL: null,
  },
  {
    url: 'https://www.unc.edu.py/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-09-at-10.23.48.jpeg',
    alt: 'Actividad académica',
    caption: 'Estudiantes y docentes en actividad institucional',
    blurDataURL: null,
  },
  {
    url: 'https://www.unc.edu.py/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-18-at-11.00.48.jpeg',
    alt: 'Jornada de investigadores',
    caption: 'XX Jornadas de Jóvenes Investigadores e Innovadores',
    blurDataURL: null,
  },
]

export const metadata = {
  title: 'Demo — Galería de noticias | UNC',
  robots: { index: false },
}

export default function GalleryDemoPage() {
  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400">
            Página de demostración — borrar luego
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white">
            Demo: Galería de noticias
          </h1>
          <p className="mt-2 text-white/50 text-sm">
            Hacé click en cualquier imagen para abrir el lightbox. Navegá con ← → o cerrá con Escape.
          </p>
        </div>

        {/* 5 images demo */}
        <div className="mb-12">
          <p className="mb-4 text-xs text-white/30 uppercase tracking-widest font-bold">5 imágenes</p>
          <NewsGallery images={DEMO_IMAGES} title="UNC participó en la presentación del Mecanismo Piloto" />
        </div>

        {/* 3 images demo */}
        <div className="mb-12">
          <p className="mb-4 text-xs text-white/30 uppercase tracking-widest font-bold">3 imágenes</p>
          <NewsGallery images={DEMO_IMAGES.slice(0, 3)} title="Rector participó en jornada académica" />
        </div>

        {/* 2 images demo */}
        <div className="mb-12">
          <p className="mb-4 text-xs text-white/30 uppercase tracking-widest font-bold">2 imágenes</p>
          <NewsGallery images={DEMO_IMAGES.slice(0, 2)} title="Actividad institucional" />
        </div>

        {/* 1 image demo */}
        <div>
          <p className="mb-4 text-xs text-white/30 uppercase tracking-widest font-bold">1 imagen</p>
          <NewsGallery images={DEMO_IMAGES.slice(0, 1)} title="Foto institucional" />
        </div>

      </div>
    </div>
  )
}
