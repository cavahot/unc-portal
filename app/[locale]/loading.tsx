// Estado de carga genérico de las rutas localizadas que no tienen su propio loading.tsx. Estilo claro del portal (antes oscuro).
// `motion-reduce` quita el pulso para quien prefiere menos movimiento.
export default function LocaleLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="min-h-screen bg-[#F4F7F5] pb-20 pt-28">
      <div className="mx-auto max-w-4xl animate-pulse px-4 motion-reduce:animate-none sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 h-9 w-56 rounded-lg bg-[#E3EDE7]" />
          <div className="h-4 w-80 max-w-full rounded bg-[#E3EDE7]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-[#E3EDE7]" style={{ width: `${60 + i * 6}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
