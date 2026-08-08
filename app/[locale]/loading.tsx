// Generic route-level loading state.
// Shown during any navigation within [locale]/ that doesn't have
// a more specific loading.tsx sibling.
export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20 animate-pulse">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-8">
          <div className="h-9 w-56 rounded-lg bg-white/5 mb-3" />
          <div className="h-4 w-80 rounded bg-white/5" />
        </div>

        {/* Content block */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-white/5" style={{ width: `${60 + i * 6}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
