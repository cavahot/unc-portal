interface ExternalCTAProps {
  href: string
  label: string
  className?: string
}

export default function ExternalCTA({ href, label, className = '' }: ExternalCTAProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-[#5CFF5C] px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_4px_24px_-8px_rgba(92,255,92,0.4)] transition-all duration-200 hover:bg-[#8AFF8A] hover:shadow-[0_8px_32px_-8px_rgba(92,255,92,0.5)] ${className}`}
    >
      {label}
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}
