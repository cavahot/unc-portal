// FAC-01: contacto de la facultad desde el CMS (spec FACULTADES.md §2.9). Antes estaba en el JSON de traducciones y
// en el código. Los `href` llegan ya filtrados por lib/cms/facultad.ts (tel solo dígitos, correo con forma válida,
// sitio y redes https de hosts permitidos); aquí además pasan por `safeHref` (DEP-15) por defensa en profundidad.
import type { FacultadDetalle } from '@/lib/cms/facultad'
import { safeHref } from '@/lib/security/safeUrl'

export interface ContactoLabels {
  direccion: string
  mapa: string
  telefono: string
  correo: string
  sitio: string
  redes: string
  nuevaPestana: string
  redesNombres: Record<string, string>
}

const link =
  'inline-flex min-h-11 items-center break-all text-lg font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-[#8AFF8A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] print:text-black'

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] p-5 sm:p-6 print:bg-white">
      <dt className="text-sm text-[#B8FFB8] print:text-black">{term}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function mapEmbedHref(direccion: string): string {
  // FAC-08: la URL del iframe usa una consulta pública sin API key.
  // Amenaza: evita guardar coordenadas inventadas o exponer secretos de Google Maps en el CMS.
  // Límite: Google controla la cartografía y puede modificar el resultado del buscador.
  const normalized = direccion.replace(/\.\s*$/, '')
  const query = /paraguay/i.test(normalized) ? normalized : `${normalized}, Concepción, Paraguay`
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
}

function InteractiveMap({ direccion, label }: { direccion: string; label: string }) {
  return (
    <div className="sm:col-span-2 rounded-2xl bg-white/[0.07] p-3 sm:p-4">
      <div className="relative aspect-[16/9] min-h-64 overflow-hidden rounded-xl border border-[#8AFF8A]/25 bg-[#073B16] shadow-[0_0_40px_rgba(57,255,136,0.12)]">
        {/* FAC-08: iframe real para conservar zoom, arrastre y controles nativos del mapa. */}
        <iframe
          title={label}
          src={mapEmbedHref(direccion)}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full grayscale"
          style={{ filter: 'grayscale(0.28) saturate(1.45) hue-rotate(62deg) brightness(0.72) contrast(1.08)' }}
        />
        {/* FAC-08: capa visual no interactiva; pointer-events permite que el usuario arrastre el mapa debajo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#39FF88]/35 mix-blend-screen" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_20%,rgba(0,35,12,0.28)_100%)]" />
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#00290D]/75 px-3 py-1 text-xs font-semibold text-[#C8FFCE] backdrop-blur-sm">
          {label}
        </span>
      </div>
    </div>
  )
}

export default function ContactoPanel({ facultad, mapHref, labels }: { facultad: FacultadDetalle; mapHref?: string; labels: ContactoLabels }) {
  const external = { target: '_blank', rel: 'noopener noreferrer' } as const
  return (
    <dl className="lt-reveal grid gap-3 rounded-[1.75rem] bg-[#004700] p-4 text-white sm:grid-cols-2 sm:p-6 lg:p-8 print:bg-white print:text-black">
      {facultad.direccion && (
        <Item term={labels.direccion}>
          <p className="text-lg font-semibold leading-7">{facultad.direccion}</p>
          {mapHref && (
            <a href={safeHref(mapHref)} {...external} className={`${link} mt-1 text-base`}>
              {labels.mapa}
              <span className="sr-only"> {labels.nuevaPestana}</span>
            </a>
          )}
        </Item>
      )}
      {facultad.direccion && <InteractiveMap direccion={facultad.direccion} label={labels.mapa} />}
      {facultad.telefono && (
        <Item term={labels.telefono}>
          {facultad.telHref ? (
            <a href={safeHref(facultad.telHref)} className={link}>
              {facultad.telefono}
            </a>
          ) : (
            <p className="text-lg font-semibold">{facultad.telefono}</p>
          )}
        </Item>
      )}
      {facultad.emails.length > 0 && (
        <Item term={labels.correo}>
          <ul>
            {facultad.emails.map((e) => (
              <li key={e.email}>
                {e.etiqueta && <span className="block text-sm text-white/80">{e.etiqueta}</span>}
                <a href={safeHref(`mailto:${e.email}`)} className={link}>
                  {e.email}
                </a>
              </li>
            ))}
          </ul>
        </Item>
      )}
      {(facultad.sitioWeb || facultad.redes.length > 0) && (
        <Item term={facultad.sitioWeb ? labels.sitio : labels.redes}>
          {facultad.sitioWeb && (
            <a href={safeHref(facultad.sitioWeb.href)} {...external} className={link}>
              {facultad.sitioWeb.label}
              <span className="sr-only"> {labels.nuevaPestana}</span>
            </a>
          )}
          {facultad.redes.length > 0 && (
            <ul aria-label={labels.redes} className="mt-2 flex flex-wrap gap-2">
              {facultad.redes.map((r) => (
                <li key={r.url}>
                  <a
                    href={safeHref(r.url)}
                    {...external}
                    className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-[#8AFF8A] hover:text-[#001A00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8AFF8A] print:text-black"
                  >
                    {labels.redesNombres[r.red] ?? r.red}
                    <span className="sr-only"> {labels.nuevaPestana}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Item>
      )}
    </dl>
  )
}
