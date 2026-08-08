export default function NoticiaDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse">
      {/* Hero image skeleton */}
      <div className="h-72 w-full bg-white/5 sm:h-96 lg:h-[480px]" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 -mt-24 relative pb-20">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-3 w-12 rounded bg-white/5" />
          <div className="h-3 w-2 rounded bg-white/5" />
          <div className="h-3 w-16 rounded bg-white/5" />
          <div className="h-3 w-2 rounded bg-white/5" />
          <div className="h-3 w-32 rounded bg-white/5" />
        </div>

        {/* Category badge */}
        <div className="mb-4 h-6 w-24 rounded-full bg-white/5" />

        {/* Title */}
        <div className="mb-4 space-y-3">
          <div className="h-8 w-full rounded-lg bg-white/5" />
          <div className="h-8 w-5/6 rounded-lg bg-white/5" />
        </div>

        {/* Meta */}
        <div className="mb-8 flex gap-4">
          <div className="h-4 w-32 rounded bg-white/5" />
          <div className="h-4 w-24 rounded bg-white/5" />
        </div>

        {/* Summary */}
        <div className="mb-8 pl-4 border-l-4 border-white/5 space-y-2">
          <div className="h-5 w-full rounded bg-white/5" />
          <div className="h-5 w-5/6 rounded bg-white/5" />
        </div>

        {/* Body */}
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-white/5" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
