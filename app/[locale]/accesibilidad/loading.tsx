// INST-08: esqueleto de /accesibilidad con la estructura de la página (cabecera verde y filas numeradas), para que el cambio
// al contenido real no salte de un fondo oscuro a uno claro. `motion-reduce` quita el pulso.
export default function AccesibilidadLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 sm:pt-32 lg:pb-28">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="mb-8 h-4 w-40 rounded bg-white/20" />
          <div className="h-14 w-80 max-w-full rounded-lg bg-white/20 sm:h-16" />
          <div className="mt-6 h-5 w-full max-w-xl rounded bg-white/15" />
        </div>
      </div>
      <div className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem]">
        <div className="mx-auto max-w-[1260px] animate-pulse px-5 motion-reduce:animate-none sm:px-6 lg:px-8">
          <div className="mb-8 h-9 w-72 max-w-full rounded bg-[#E3EDE7]" />
          <ul className="max-w-[72ch] divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex gap-5 px-6 py-6 sm:px-8">
                <div className="h-8 w-9 rounded bg-[#E3EDE7]" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-1/2 rounded bg-[#E3EDE7]" />
                  <div className="h-4 w-4/5 rounded bg-[#E3EDE7]" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
