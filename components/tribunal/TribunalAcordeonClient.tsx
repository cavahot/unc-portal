'use client'

// INST-02: acordeón de documentos por etapa del proceso electoral, con el estilo claro del portal.
// Qué hace: una lista de seis etapas; cada una se abre con un botón (aria-expanded/aria-controls) y muestra sus
// documentos o un texto de «sin documentos». Por qué cliente: solo el estado abierto/cerrado necesita el navegador.
// DEP-15: los href que provienen del CMS pasan por safeHref (bloquea javascript:/data:).
// Límite: no consulta el CMS ni traduce; recibe los documentos y los textos ya resueltos.
import { safeHref } from '@/lib/security/safeUrl'
import { useState } from 'react'
import type { TribunalDocumentoItem, TribunalDocumentoTipo } from '@/lib/cms/queries/tribunal'
import { ACCORDION_TIPOS } from '@/lib/cms/queries/tribunal'

interface Translations {
  tipos: Record<string, string>
  viewDoc: string
  noDocuments: string
  /** Aviso para lectores de pantalla: el enlace abre en una pestaña nueva. */
  newTab: string
}

interface Props {
  documentos: TribunalDocumentoItem[]
  t: Translations
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function TribunalAcordeonClient({ documentos, t }: Props) {
  const [open, setOpen] = useState<Set<TribunalDocumentoTipo>>(new Set())

  function toggle(tipo: TribunalDocumentoTipo) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo)
      else next.add(tipo)
      return next
    })
  }

  return (
    <div className="divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
      {ACCORDION_TIPOS.map((tipo, idx) => {
        const isOpen = open.has(tipo)
        const docs = documentos.filter((d) => d.tipo === tipo)
        const panelId = `panel-${tipo}`
        const btnId = `btn-${tipo}`

        return (
          <div key={tipo}>
            <button
              id={btnId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(tipo)}
              className="flex min-h-14 w-full items-center justify-between gap-4 px-6 py-5 text-left text-[#09231D] transition-colors hover:bg-[#F4F7F5] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#00A300] sm:px-8"
            >
              <span className="flex items-baseline gap-4">
                <span aria-hidden="true" className="font-serif text-xl font-bold tabular-nums text-[#00A300]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-base font-semibold sm:text-lg">{t.tipos[tipo] ?? tipo}</span>
              </span>
              <span className="flex items-center gap-3 text-[#3E4A45]">
                {docs.length > 0 && <span className="text-sm font-semibold tabular-nums">{docs.length}</span>}
                <ChevronIcon open={isOpen} />
              </span>
            </button>

            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen}>
              <div className="border-t border-[#D7E0DB] bg-[#F4F7F5] px-6 py-5 sm:px-8">
                {docs.length === 0 ? (
                  <p className="text-base text-[#3E4A45]">{t.noDocuments}</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {docs.map((doc) => (
                      <li key={doc.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-[#09231D]">{doc.titulo}</p>
                          {doc.descripcion && <p className="mt-0.5 max-w-[65ch] text-sm text-[#3E4A45]">{doc.descripcion}</p>}
                        </div>
                        {doc.driveUrl && (
                          <a
                            href={safeHref(doc.driveUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border-2 border-[#004700]/30 px-5 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
                          >
                            {t.viewDoc}
                            <span className="sr-only">: {doc.titulo}. {t.newTab}</span>
                          </a>
                        )}
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
