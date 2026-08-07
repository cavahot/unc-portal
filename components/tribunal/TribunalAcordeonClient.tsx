'use client'

import { useState } from 'react'
import type { TribunalDocumentoItem, TribunalDocumentoTipo } from '@/lib/cms/queries/tribunal'
import { ACCORDION_TIPOS } from '@/lib/cms/queries/tribunal'

interface Translations {
  tipos:       Record<string, string>
  viewDoc:     string
  noDocuments: string
}

interface Props {
  documentos: TribunalDocumentoItem[]
  t:          Translations
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function TribunalAcordeonClient({ documentos, t }: Props) {
  const [open, setOpen] = useState<Set<TribunalDocumentoTipo>>(new Set())

  function toggle(tipo: TribunalDocumentoTipo) {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) {
        next.delete(tipo)
      } else {
        next.add(tipo)
      }
      return next
    })
  }

  return (
    <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
      {ACCORDION_TIPOS.map((tipo, idx) => {
        const isOpen  = open.has(tipo)
        const docs    = documentos.filter(d => d.tipo === tipo)
        const panelId = `panel-${tipo}`
        const btnId   = `btn-${tipo}`

        return (
          <div key={tipo}>
            {/* Header */}
            <button
              id={btnId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(tipo)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-inset"
            >
              {/* Step number + label */}
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5CFF5C]/30 bg-[#5CFF5C]/10 text-sm font-bold tabular-nums text-[#5CFF5C]">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-100 sm:text-base">
                  {t.tipos[tipo] ?? tipo}
                </span>
              </div>

              {/* Count badge + chevron */}
              <div className="flex items-center gap-3">
                {docs.length > 0 && (
                  <span className="rounded-full bg-[#5CFF5C]/10 px-2.5 py-0.5 text-xs font-medium text-[#5CFF5C]">
                    {docs.length}
                  </span>
                )}
                <span className="text-slate-400">
                  <ChevronIcon open={isOpen} />
                </span>
              </div>
            </button>

            {/* Panel */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!isOpen}
            >
              <div className="border-t border-slate-800 bg-slate-900/50 px-6 py-4">
                {docs.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">{t.noDocuments}</p>
                ) : (
                  <ul className="space-y-3">
                    {docs.map(doc => (
                      <li key={doc.id} className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#5CFF5C]/60">
                          <FileIcon />
                        </span>
                        <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-200">{doc.titulo}</p>
                            {doc.descripcion && (
                              <p className="mt-0.5 text-xs text-slate-500">{doc.descripcion}</p>
                            )}
                          </div>
                          {doc.driveUrl ? (
                            <a
                              href={doc.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#5CFF5C]/30 bg-[#5CFF5C]/10 px-3 py-1.5 text-xs font-semibold text-[#5CFF5C] transition-colors hover:bg-[#5CFF5C]/20"
                            >
                              {t.viewDoc}
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
