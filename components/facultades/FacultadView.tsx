// FAC-01: página de facultad reutilizable (spec docs/specs/portal/FACULTADES.md §2). Contenedor de servidor: lee el
// CMS con getFacultadDetalle, traduce textos de interfaz (messages/*/pages.facultades.json → `detalle`) y compone los
// componentes de presentación. Cualquier facultad se convierte con una página de 10 líneas (ver odontologia/page.tsx).
// Sin datos de demostración: lo que el CMS no tiene no se pinta.
import { notFound } from 'next/navigation'
import { getT } from '@/lib/i18n/server'
import { mapsSearchHref, visibleSections, type SectionId } from '@/lib/cms/facultad'
import { getFacultadDetalle, type FacultadDetalleResult } from '@/lib/cms/queries/facultad'
import FacultadHero from './FacultadHero'
import FacultadFoto from './FacultadFoto'
import SectionIndex from './SectionIndex'
import CarrerasList, { type CarrerasListLabels } from './CarrerasList'
import DecanoCard from './DecanoCard'
import AcreditacionBadge from './AcreditacionBadge'
import ArancelesTable from './ArancelesTable'
import ContactoPanel from './ContactoPanel'

type T = Awaited<ReturnType<typeof getT>>

/** Encabezado de sección: serif grande, intro opcional en tinta completa. */
function SectionHeading({ id, title, intro }: { id: string; title: string; intro?: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <h2 id={`${id}-title`} className="font-serif text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#001A00] sm:text-[2.6rem]">
        {title}
      </h2>
      {intro && <p className="mt-3 text-lg leading-8 text-[#001A00]">{intro}</p>}
    </div>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-[1.25rem] bg-white p-6 text-base leading-7 text-[#001A00] sm:p-8">
      {children}
    </p>
  )
}

/** Metadatos desde el CMS (nombre real de la facultad), con descripción traducida. */
export async function facultadMetadata(slug: string, locale: string) {
  const [result, t] = await Promise.all([getFacultadDetalle(slug), getT(locale, 'pages.facultades.detalle')])
  if (result.status !== 'ok') return {}
  const { nombre, descripcion } = result.facultad
  return { title: `${nombre} | UNC`, description: descripcion ?? t('meta.description', { nombre }) }
}

export default async function FacultadView({ slug, locale }: { slug: string; locale: string }) {
  const [result, t]: [FacultadDetalleResult, T] = await Promise.all([getFacultadDetalle(slug), getT(locale, 'pages.facultades.detalle')])
  const prefix = locale === 'es' ? '' : `/${locale}`

  if (result.status === 'not-found') notFound()
  if (result.status === 'unavailable') {
    return (
      <section className="bg-[#F4F7F5] pb-24 pt-32">
        <div className="mx-auto max-w-[1260px] px-4 sm:px-6 lg:px-8">
          <Notice>{t('states.unavailable')}</Notice>
        </div>
      </section>
    )
  }

  const { facultad, carreras, decano, acreditaciones, aranceles } = result
  const grado = carreras.status === 'ok' ? carreras.grado : []
  const posgrado = carreras.status === 'ok' ? carreras.posgrado : []
  const sections = visibleSections({
    presentacion: facultad.historia.length > 0,
    posgrado: posgrado.length > 0,
    decanato: decano !== null,
    acreditacion: acreditaciones.length > 0,
    aranceles: aranceles.length > 0,
    contacto: Boolean(facultad.direccion || facultad.telefono || facultad.emails.length || facultad.sitioWeb || facultad.redes.length),
  })
  const show = (id: SectionId) => sections.includes(id)

  const fichaRows = [
    decano && { term: t('hero.decano'), value: decano.name },
    carreras.status === 'ok' && { term: t('hero.grado'), value: String(grado.length) },
    carreras.status === 'ok' && posgrado.length > 0 && { term: t('hero.posgrado'), value: String(posgrado.length) },
  ].filter(Boolean) as Array<{ term: string; value: string }>

  const carrerasLabels: CarrerasListLabels = {
    resLabel: t('carreras.resLabel'),
    resOpen: (numero) => t('carreras.resOpen', { numero }),
    sede: t('carreras.sede'),
    modalidad: t('carreras.modalidad'),
    titulo: t('carreras.titulo'),
    duracion: (count) => t('carreras.duracion', { count }),
    perfil: t('carreras.perfil'),
  }
  const sectionClass = 'scroll-mt-28'

  return (
    <>
      <FacultadHero
        nombre={facultad.nombre}
        siglas={facultad.siglas}
        descripcion={facultad.descripcion}
        logoSrc={facultad.logoSrc}
        logoAlt={t('hero.logoAlt', { nombre: facultad.nombre })}
        breadcrumb={{ inicio: t('breadcrumb.inicio'), inicioHref: prefix || '/', facultades: t('breadcrumb.facultades'), facultadesHref: `${prefix}/facultades` }}
        cta={grado.length + posgrado.length > 0 ? { label: t('hero.cta'), href: '#grado' } : undefined}
        ficha={{ label: t('hero.fichaLabel'), rows: fichaRows }}
      />

      <FacultadFoto
        imagen={facultad.imagen}
        altPropia={t('foto.propiaAlt', { nombre: facultad.nombre })}
        fallback={{ src: '/images/campus-aereo-unc.webp', alt: t('foto.campusAlt'), caption: t('foto.campusCaption') }}
      />

      <div className="bg-[#F4F7F5] pb-24 pt-14 sm:pb-32 lg:pt-24 print:bg-white">
        <div className="mx-auto grid max-w-[1260px] gap-10 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:px-8">
          <SectionIndex label={t('index.label')} items={sections.map((id) => ({ id, label: t(`index.${id}`) }))} />

          <div className="flex min-w-0 flex-col gap-24 sm:gap-32">
            {show('presentacion') && (
              <section id="presentacion" aria-labelledby="presentacion-title" className={sectionClass}>
                <SectionHeading id="presentacion" title={t('presentacion.title')} />
                <div className="lt-reveal max-w-3xl space-y-5 text-lg leading-8 text-[#001A00]">
                  {facultad.historia.map((p, i) => (
                    <p key={i} className={i === 0 ? 'text-xl leading-9 sm:text-[1.4rem] sm:leading-10' : undefined}>
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}

            <section id="grado" aria-labelledby="grado-title" className={sectionClass}>
              <SectionHeading id="grado" title={t('carreras.gradoTitle')} intro={grado.length ? t('carreras.gradoIntro') : undefined} />
              {carreras.status === 'unavailable' ? (
                <Notice>{t('carreras.unavailable')}</Notice>
              ) : grado.length === 0 ? (
                <Notice>{t('carreras.empty')}</Notice>
              ) : (
                <CarrerasList items={grado} labels={carrerasLabels} />
              )}
            </section>

            {show('posgrado') && (
              <section id="posgrado" aria-labelledby="posgrado-title" className={sectionClass}>
                <SectionHeading id="posgrado" title={t('carreras.posgradoTitle')} intro={t('carreras.posgradoIntro')} />
                <CarrerasList items={posgrado} labels={carrerasLabels} compact />
              </section>
            )}

            {show('decanato') && decano && (
              <section id="decanato" aria-labelledby="decanato-title" className={sectionClass}>
                <SectionHeading id="decanato" title={t('decanato.title')} />
                <DecanoCard decano={decano} autoridadesHref={`${prefix}/autoridades`} labels={{ verAutoridades: t('decanato.verAutoridades'), correo: t('decanato.correo') }} />
              </section>
            )}

            {show('acreditacion') && (
              <section id="acreditacion" aria-labelledby="acreditacion-title" className={sectionClass}>
                <SectionHeading id="acreditacion" title={t('acreditacion.title')} />
                <AcreditacionBadge
                  items={acreditaciones}
                  labels={{
                    badge: (organismo) => t('acreditacion.badge', { organismo }),
                    vigencia: (anio) => t('acreditacion.vigencia', { anio }),
                    fuente: t('acreditacion.fuente'),
                  }}
                />
              </section>
            )}

            {show('aranceles') && (
              <section id="aranceles" aria-labelledby="aranceles-title" className={sectionClass}>
                <SectionHeading id="aranceles" title={t('aranceles.title')} intro={t('aranceles.intro')} />
                <ArancelesTable
                  groups={aranceles}
                  labels={{
                    concept: t('aranceles.concept'),
                    amount: t('aranceles.amount'),
                    currencyName: t('aranceles.currencyName'),
                    caption: (grupo) => t('aranceles.caption', { grupo }),
                    grupos: {
                      multas: t('aranceles.grupos.multas'),
                      venta: t('aranceles.grupos.venta'),
                      servicios: t('aranceles.grupos.servicios'),
                      medicos: t('aranceles.grupos.medicos'),
                    },
                  }}
                />
              </section>
            )}

            {show('contacto') && (
              <section id="contacto" aria-labelledby="contacto-title" className={sectionClass}>
                <SectionHeading id="contacto" title={t('contacto.title')} />
                <ContactoPanel
                  facultad={facultad}
                  mapHref={mapsSearchHref(facultad.direccion)}
                  labels={{
                    direccion: t('contacto.direccion'),
                    mapa: t('contacto.mapa'),
                    telefono: t('contacto.telefono'),
                    correo: t('contacto.correo'),
                    sitio: t('contacto.sitio'),
                    redes: t('contacto.redes'),
                    nuevaPestana: t('contacto.nuevaPestana'),
                    redesNombres: {
                      facebook: t('contacto.redesNombres.facebook'),
                      instagram: t('contacto.redesNombres.instagram'),
                      x: t('contacto.redesNombres.x'),
                      youtube: t('contacto.redesNombres.youtube'),
                    },
                  }}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
