// FAC-01: índice «En esta página» (spec FACULTADES.md §2.4). Solo recibe secciones visibles: el índice nunca lleva
// a una sección vacía. Columna fija en pantallas anchas; en móvil, fila desplazable de enlaces de 44 px.
// Sin JS: son anclas; el navegador hace el desplazamiento (respeta `prefers-reduced-motion` con `scroll-behavior` del sitio).

export interface SectionIndexProps {
  label: string
  items: Array<{ id: string; label: string }>
}

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004700]'

export default function SectionIndex({ label, items }: SectionIndexProps) {
  return (
    <nav aria-label={label} className="min-w-0 print:hidden">
      {/* Móvil y tableta: fila desplazable. */}
      <ul className="flex flex-wrap gap-2 lg:hidden">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#004700] transition-colors hover:bg-[#004700] hover:text-white ${focus}`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
      {/* Pantallas anchas: columna fija. */}
      <div className="sticky top-28 hidden lg:block">
        <p className="mb-4 text-sm font-semibold text-[#3E4A45]">{label}</p>
        <ul className="flex flex-col gap-1">
          {items.map((i) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                className={`flex min-h-11 items-center rounded-xl px-4 text-[0.95rem] font-medium text-[#001A00] transition-colors hover:bg-white hover:text-[#004700] ${focus}`}
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
