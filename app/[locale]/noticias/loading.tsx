export default function NoticiasLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20 animate-pulse">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading skeleton */}
        <div className="mb-10">
          <div className="h-9 w-48 rounded-lg bg-white/5 mb-3" />
          <div className="h-4 w-72 rounded bg-white/5" />
        </div>

        {/* Filter bar skeleton */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-white/5" />
          ))}
        </div>

        {/* Card grid skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
              <div className="h-48 bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 rounded bg-white/5" />
                <div className="h-5 w-full rounded bg-white/5" />
                <div className="h-5 w-4/5 rounded bg-white/5" />
                <div className="h-4 w-full rounded bg-white/5" />
                <div className="h-4 w-3/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
