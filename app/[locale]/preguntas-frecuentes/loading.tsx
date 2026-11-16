// Esqueleto de /preguntas-frecuentes con la estructura de la página (cabecera verde y lista de preguntas), para que el cambio
// al contenido real no salte de un fondo oscuro a uno claro. `motion-reduce` quita el pulso.
export default function PreguntasFrecuentesLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 sm:pt-32 lg:pb-28">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="mb-8 h-4 w-40 rounded bg-white/20" />
          <div className="h-14 w-96 max-w-full rounded-lg bg-white/20 sm:h-16" />
          <div className="mt-6 h-5 w-full max-w-xl rounded bg-white/15" />
        </div>
      </div>
      <div className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem]">
        <div className="mx-auto max-w-3xl animate-pulse px-5 motion-reduce:animate-none sm:px-6 lg:px-8">
          <div className="mb-6 h-14 rounded-2xl bg-[#E3EDE7]" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
