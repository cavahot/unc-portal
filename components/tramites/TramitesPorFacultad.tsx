// INST-05: trámites de /tramites agrupados por facultad (servidor, sin estado). Spec docs/specs/portal/TRAMITES.md §2.6.
// Qué hace: una sección por facultad y, dentro, una fila por trámite. A la izquierda el título (con su etiqueta, p. ej.
// «Art. 150°») y la descripción; a la derecha la lista de requisitos y la nota. Todo el texto llega del CMS ya mapeado
// (`agruparTramites`); aquí no hay contenido institucional escrito.
// Por qué filas visibles y no pestañas: el componente anterior solo mostraba una facultad a la vez, lo que oculta el
// resto a buscadores y a la impresión y obliga a hacer clic para comparar. Con 18 trámites la página es corta; el índice
// de la cabecera permite saltar a una facultad. Los requisitos van en una lista (`<ul>`): son elementos paralelos que
// se leen y se tachan uno a uno, no pasos de un proceso.
// Límite: no consulta el CMS ni traduce; recibe los grupos y los textos de interfaz ya resueltos.
import type { GrupoTramites } from '@/lib/cms/tramites'

export interface TramitesPorFacultadLabels {
  /** Encabezado de la lista de requisitos de un trámite (para lectores de pantalla y vista). */
  requisitos: string
  /** Prefijo de la nota («Nota»). */
  nota: string
  /** Texto accesible de la lista de trámites de una facultad: recibe el nombre de la facultad. */
  listaDe: (facultad: string) => string
}

export default function TramitesPorFacultad({ grupos, labels }: { grupos: GrupoTramites[]; labels: TramitesPorFacultadLabels }) {
  return (
    <div className="flex flex-col gap-16">
      {grupos.map((g) => (
        <section key={g.facultad.slug} id={`fac-${g.facultad.slug}`} aria-labelledby={`fac-${g.facultad.slug}-titulo`} className="scroll-mt-28">
          <h2 id={`fac-${g.facultad.slug}-titulo`} className="text-balance font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
            {g.facultad.nombre}
          </h2>
          <ul aria-label={labels.listaDe(g.facultad.nombre)} className="mt-8 divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
            {g.tramites.map((t) => (
              <li key={t.id} className="grid gap-x-12 gap-y-5 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div>
                  <h3 className="text-balance font-serif text-xl font-bold leading-snug tracking-[-0.01em] text-[#09231D] sm:text-2xl">{t.titulo}</h3>
                  {t.etiqueta && <p className="mt-2 text-sm font-semibold text-[#004700]">{t.etiqueta}</p>}
                  {t.descripcion && <p className="mt-3 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{t.descripcion}</p>}
                </div>
                <div>
                  {t.requisitos.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-[#3E4A45]">{labels.requisitos}</p>
                      <ul className="mt-3 flex flex-col gap-2.5">
                        {t.requisitos.map((r, i) => (
                          <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-base leading-7 text-[#1F2D27]">
                            <span aria-hidden="true" className="mt-[0.7rem] h-1.5 w-1.5 rounded-full bg-[#00A300]" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {t.nota && (
                    <p className={`max-w-[65ch] rounded-xl bg-[#F4F7F5] px-4 py-3 text-base leading-7 text-[#1F2D27] ${t.requisitos.length > 0 ? 'mt-5' : ''}`}>
                      <span className="font-semibold text-[#004700]">{labels.nota}: </span>
                      {t.nota}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
