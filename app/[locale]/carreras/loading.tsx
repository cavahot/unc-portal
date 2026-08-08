export default function CarrerasLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20 animate-pulse">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-10">
          <div className="h-9 w-40 rounded-lg bg-white/5 mb-3" />
          <div className="h-4 w-64 rounded bg-white/5" />
        </div>

        {/* Card list skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 flex items-center gap-6">
              <div className="h-12 w-12 rounded-xl bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/5 rounded bg-white/5" />
                <div className="h-4 w-2/5 rounded bg-white/5" />
              </div>
              <div className="h-6 w-20 rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
