// INST-11: esqueleto de /legalizaciones con la estructura de la página (cabecera verde con datos del trámite y bloques de
// requisitos), para que el cambio al contenido real no salte de un fondo oscuro a uno claro. `motion-reduce` quita el pulso.
export default function LegalizacionesLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 sm:pt-32 lg:pb-28">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="mb-8 h-4 w-40 rounded bg-white/20" />
          <div className="h-14 w-96 max-w-full rounded-lg bg-white/20 sm:h-16" />
          <div className="mt-6 h-5 w-full max-w-xl rounded bg-white/15" />
          <div className="mt-8 flex flex-wrap gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 w-44 rounded-2xl bg-white/15" />
            ))}
          </div>
        </div>
      </div>
      <div className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem]">
        <div className="mx-auto max-w-[1260px] animate-pulse px-5 motion-reduce:animate-none sm:px-6 lg:px-8">
          <div className="mb-8 h-9 w-72 max-w-full rounded bg-[#E3EDE7]" />
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-3 rounded-2xl bg-white p-6 sm:p-8">
                <div className="h-7 w-1/2 rounded bg-[#E3EDE7]" />
                <div className="h-4 w-4/5 rounded bg-[#E3EDE7]" />
                <div className="h-4 w-3/5 rounded bg-[#E3EDE7]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
