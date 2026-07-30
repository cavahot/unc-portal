interface DocumentCardProps {
  label: string
  url?: string | null
  nota?: string | null
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-[#5CFF5C]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16"
      />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-white/30"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

export default function DocumentCard({ label, url, nota }: DocumentCardProps) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-4 transition-all duration-200 hover:border-[#5CFF5C]/30 hover:bg-white/[0.08] hover:shadow-[0_4px_16px_-8px_rgba(0,200,0,0.15)]"
      >
        <DownloadIcon />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug text-white group-hover:text-[#8AFF8A] transition-colors">
            {label}
          </p>
          {nota && (
            <p className="mt-1 text-xs text-white/40">{nota}</p>
          )}
        </div>
        <ExternalIcon />
      </a>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-50">
      <svg
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-white/30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug text-white/60">{label}</p>
        <p className="mt-1 text-xs text-white/30">Documento pendiente</p>
        {nota && (
          <p className="mt-0.5 text-xs text-white/25">{nota}</p>
        )}
      </div>
    </div>
  )
}
