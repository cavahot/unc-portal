// INST-03: esqueleto de una noticia con la estructura de la página (cabecera verde, imagen y columna de lectura).
export default function NoticiaDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-24 pt-28 sm:pt-32 lg:pb-28">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="mb-8 h-4 w-56 rounded bg-white/20" />
          <div className="h-10 w-full max-w-3xl rounded-lg bg-white/20 sm:h-12" />
          <div className="mt-3 h-10 w-2/3 max-w-xl rounded-lg bg-white/20" />
          <div className="mt-6 h-5 w-full max-w-xl rounded bg-white/15" />
        </div>
      </div>
      <div className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem]">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8 animate-pulse motion-reduce:animate-none">
          <div className="mx-auto mb-12 aspect-[16/9] max-w-5xl rounded-2xl bg-[#E3EDE7]" />
          <div className="mx-auto max-w-[68ch] space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-4 rounded bg-[#E3EDE7] ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
