// INST-07: esqueleto de /calendario-academico con la estructura de la página (cabecera verde y dos listas de fechas), para que
// el cambio al contenido real no salte de un fondo oscuro a uno claro. `motion-reduce` quita el pulso.
export default function CalendarioAcademicoLoading() {
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
        <div className="mx-auto grid max-w-[1260px] gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 animate-pulse motion-reduce:animate-none">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="mb-8 h-9 w-64 max-w-full rounded bg-[#E3EDE7]" />
              <ul className="divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
                {Array.from({ length: 5 }).map((_, j) => (
                  <li key={j} className="flex items-center justify-between gap-6 px-6 py-5 sm:px-8">
                    <div className="h-5 w-1/2 rounded bg-[#E3EDE7]" />
                    <div className="h-5 w-24 rounded bg-[#E3EDE7]" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
