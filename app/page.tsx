import Image from 'next/image';
import Link from 'next/link';

import CinematicHero from '@/components/hero/CinematicHero';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import StatsBlock from '@/components/stats/StatsBlock';
import { getNews } from '@/lib/cms/queries/news';

/* =========================================================
   DATOS
   ========================================================= */

const quickLinks = [
  {
    title: 'Carreras',
    description:
      'Explora la oferta académica por facultad y nivel.',
    href: '/carreras',
    label: 'Oferta académica',
    action: 'Consultar información',
    external: false,
  },
  {
    title: 'Calendario Académico',
    description:
      'Consulta fechas, periodos y actividades importantes.',
    href: '/calendario-academico',
    label: 'Fechas importantes',
    action: 'Consultar información',
    external: false,
  },
  {
    title: 'Títulos y Legalizaciones',
    description:
      'Información sobre trámites y documentación académica.',
    href: '/tramites',
    label: 'Gestiones académicas',
    action: 'Consultar información',
    external: false,
  },
  {
    title: 'Aula Virtual',
    description:
      'Accede a la plataforma institucional de aprendizaje.',
    href: 'https://aula.unc.edu.py',
    label: 'Plataforma educativa',
    action: 'Acceder a la plataforma',
    external: true,
  },
];

const transparencyItems = [
  {
    title: 'Ley 5189/14',
    description:
      'Información pública sobre remuneraciones y asignaciones.',
    href: '/transparencia',
    featured: true,
  },
  {
    title: 'Ley 5282/14',
    description:
      'Acceso ciudadano a la información pública institucional.',
    href: '/transparencia',
    featured: false,
  },
];

/* =========================================================
   ICONOS
   ========================================================= */

function ArrowIcon({
  className = 'h-4 w-4',
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14m-6-6 6 6-6 6"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 4h6m0 0v6m0-6-9 9M5 7v12h12v-5"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z"
      />
    </svg>
  );
}

/* =========================================================
   PÁGINA PRINCIPAL
   ========================================================= */

export default async function Home() {
  const { docs: noticias } = await getNews({ limit: 6 })

  return (
    <>
      <CinematicHero />

      {/* =====================================================
          ACCESOS RÁPIDOS
          ===================================================== */}

      <section
  id="accesos"
  aria-labelledby="quick-links-title"
  className="
    relative z-20
    -mt-[18svh]
    overflow-hidden
    bg-[linear-gradient(to_bottom,rgba(244,247,245,0)_0%,rgba(244,247,245,0.42)_18%,rgba(244,247,245,0.82)_38%,#F4F7F5_56%,#F4F7F5_100%)]
    pb-24
    pt-[27svh]
    sm:-mt-[20svh]
    sm:pb-28
    sm:pt-[30svh]
  "
>
        <div
  aria-hidden="true"
  className="pointer-events-none absolute left-1/2 top-[20svh] h-80 w-[70rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,163,0,0.08),transparent_68%)]"
/>

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <header className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                Servicios institucionales
              </span>

              <h2
                id="quick-links-title"
                className="mt-4 font-serif text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-[#09231D] sm:text-5xl lg:text-6xl"
              >
                Accesos rápidos
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6C7B76] sm:text-lg">
                Encuentra rápidamente los servicios académicos
                y administrativos más consultados.
              </p>
            </header>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item, index) => {
              const content = (
                <div className="relative z-10 flex h-full flex-col [transform:translateZ(24px)]">
                  <div className="mb-7 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6FFE6] text-sm font-extrabold text-[#004700] transition-colors duration-300 group-hover:bg-[#00A300] group-hover:text-white">
                      {String(index + 1).padStart(
                        2,
                        '0',
                      )}
                    </span>

                    <span className="text-[#008000] transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[#00A300]">
                      {item.external ? (
                        <ExternalLinkIcon />
                      ) : (
                        <ArrowIcon />
                      )}
                    </span>
                  </div>

                  <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
                    {item.label}
                  </span>

                  <h3 className="mt-3 text-xl font-bold leading-tight text-[#09231D]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#6C7B76]">
                    {item.description}
                  </p>

                  <span className="mt-auto inline-flex items-center gap-2 pt-8 text-xs font-bold text-[#008000] transition-colors duration-300 group-hover:text-[#004700]">
                    {item.action}

                    <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              );

              return (
                <Reveal
                  key={item.title}
                  className="h-full"
                  delay={index * 80}
                >
                  <TiltCard
                    containerClassName="h-full"
                    className="
                      h-full rounded-[1.35rem]
                      border border-[#D7E0DB]
                      bg-white p-7
                      shadow-[0_18px_48px_rgba(7,42,15,0.08)]
                      hover:border-[#37D448]
                      hover:shadow-[0_30px_65px_rgba(0,71,0,0.18)]
                      focus-within:border-[#37D448]
                      focus-within:shadow-[0_30px_65px_rgba(0,71,0,0.18)]
                    "
                  >
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${item.title}. Abre en una nueva pestaña`}
                        className="group block h-full rounded-[1rem] focus-visible:outline-none"
                      >
                        {content}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="group block h-full rounded-[1rem] focus-visible:outline-none"
                      >
                        {content}
                      </Link>
                    )}
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          NOTICIAS
          ===================================================== */}

      <section
        id="noticias"
        aria-labelledby="news-title"
        className="relative isolate overflow-hidden bg-[#00A300] py-24 text-[#001A00] sm:py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-36 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-white/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 bottom-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#5CFF5C]/20 blur-3xl"
        />

        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <header className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#001A00]/70">
                  Actualidad universitaria
                </span>

                <h2
                  id="news-title"
                  className="mt-4 font-serif text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-[#001A00] sm:text-5xl lg:text-6xl"
                >
                  Últimas noticias
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-7 text-[#001A00]/75 sm:text-lg">
                  Información sobre actividades académicas,
                  investigación, extensión universitaria y
                  gestión institucional.
                </p>
              </div>

              <Link
                href="/noticias"
                className="
                  group inline-flex w-fit items-center justify-center gap-3
                  rounded-full border border-[#001A00]/15
                  bg-[#001A00] px-6 py-3.5
                  text-sm font-extrabold text-white
                  shadow-[0_14px_32px_rgba(0,26,0,0.24)]
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:bg-[#004700]
                  hover:shadow-[0_20px_42px_rgba(0,26,0,0.3)]
                  focus-visible:outline-none
                "
              >
                Ver todas las noticias

                <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </header>
          </Reveal>

          <div className="mt-14 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {noticias.map((n, index) => (
              <Reveal
                key={n.id}
                className="h-full"
                delay={index * 90}
              >
                <TiltCard
                  containerClassName="h-full"
                  rotateX={6}
                  rotateY={7}
                  className="
                    h-full rounded-[1.45rem]
                    border border-[#001A00]/10
                    bg-white
                    shadow-[0_22px_55px_rgba(0,26,0,0.18)]
                    hover:border-[#004700]/40
                    hover:shadow-[0_34px_70px_rgba(0,26,0,0.28)]
                  "
                >
                  <Link
                    href={`/noticias/${n.slug}`}
                    aria-label={`Leer noticia: ${n.title}`}
                    className="group block h-full focus-visible:outline-none"
                  >
                    <div className="relative h-60 overflow-hidden sm:h-64">
                      <Image
                        src={n.featuredImage?.url ?? '/images/campus-3d/hero-entry-960.webp'}
                        alt={n.featuredImage?.alt ?? n.title}
                        fill
                        sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
                        className="
                          object-cover
                          transition-transform
                          duration-700
                          ease-[cubic-bezier(0.2,0.7,0.2,1)]
                          group-hover:scale-[1.08]
                        "
                      />

                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#001A00]/30 via-transparent to-transparent"
                      />

                      <span className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#001A00] text-xs font-extrabold text-white shadow-lg">
                        {String(index + 1).padStart(
                          2,
                          '0',
                        )}
                      </span>
                    </div>

                    <div className="relative z-10 flex min-h-[205px] flex-col p-7 [transform:translateZ(24px)]">
                      <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
                        {n.category ?? 'Institucional'}
                      </span>

                      <h3 className="mt-3 max-w-[95%] text-xl font-bold leading-snug text-[#09231D] transition-colors duration-300 group-hover:text-[#004700]">
                        {n.title}
                      </h3>

                      <div className="mt-auto flex items-center justify-between gap-4 pt-7">
                        <time
                          dateTime={n.publishedAt ?? ''}
                          className="text-sm text-[#52635E]"
                        >
                          {n.publishedAt
                            ? new Date(n.publishedAt).toLocaleDateString('es-PY', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : ''}
                        </time>

                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6FFE6] text-[#008000] transition-all duration-300 group-hover:translate-x-1 group-hover:bg-[#00A300] group-hover:text-white">
                          <ArrowIcon />
                        </span>
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <StatsBlock />

      {/* =====================================================
          TRANSPARENCIA
          ===================================================== */}

      <section
        id="transparencia"
        aria-labelledby="transparency-title"
        className="relative overflow-hidden bg-[#F4F7F5] py-24 sm:py-28"
      >
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <header className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#008000]">
                Gestión pública
              </span>

              <h2
                id="transparency-title"
                className="mt-4 font-serif text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-[#09231D] sm:text-5xl lg:text-6xl"
              >
                Transparencia activa
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6C7B76] sm:text-lg">
                Accede a documentos, normativas e información
                pública de la Universidad Nacional de
                Concepción.
              </p>
            </header>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-5xl gap-7 md:grid-cols-2">
            {transparencyItems.map(
              (item, index) => (
                <Reveal
                  key={item.title}
                  className="h-full"
                  delay={index * 100}
                >
                  <TiltCard
                    containerClassName="h-full"
                    rotateX={6}
                    rotateY={7}
                    className={`
                      h-full rounded-[1.25rem]
                      border bg-white p-7
                      ${
                        item.featured
                          ? 'border-[#37D448]/60 shadow-[0_26px_60px_rgba(7,183,25,0.14)]'
                          : 'border-[#D7E0DB] shadow-[0_18px_48px_rgba(7,42,15,0.08)]'
                      }
                      hover:border-[#37D448]
                      hover:shadow-[0_30px_65px_rgba(0,71,0,0.17)]
                    `}
                  >
                    <Link
                      href={item.href}
                      className="group grid h-full grid-cols-[58px_1fr_auto] items-center gap-5 focus-visible:outline-none"
                    >
                      <span
                        className={`
                          flex h-14 w-14 items-center justify-center rounded-2xl
                          transition-all duration-300
                          ${
                            item.featured
                              ? 'bg-[#00A300] text-white'
                              : 'bg-[#E6FFE6] text-[#008000]'
                          }
                          group-hover:scale-105
                          group-hover:bg-[#00A300]
                          group-hover:text-white
                        `}
                      >
                        <DocumentIcon />
                      </span>

                      <span className="min-w-0 [transform:translateZ(22px)]">
                        <strong className="block text-lg font-bold text-[#004700]">
                          {item.title}
                        </strong>

                        <small className="mt-2 block text-sm leading-6 text-[#6C7B76]">
                          {item.description}
                        </small>
                      </span>

                      <span className="text-[#008000] transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[#00A300]">
                        <ArrowIcon className="h-5 w-5" />
                      </span>
                    </Link>
                  </TiltCard>
                </Reveal>
              ),
            )}
          </div>

          <Reveal delay={180}>
            <div className="mt-12 text-center">
              <Link
                href="/transparencia"
                className="
                  group inline-flex items-center justify-center gap-3
                  rounded-full border border-[#008000]
                  bg-transparent px-6 py-3.5
                  text-sm font-extrabold text-[#004700]
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:bg-[#008000]
                  hover:text-white
                  hover:shadow-[0_16px_34px_rgba(0,128,0,0.24)]
                  focus-visible:outline-none
                "
              >
                Consultar el portal de transparencia

                <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FRANJA INSTITUCIONAL
          ===================================================== */}

      <section
        id="institucional"
        aria-label="Identidad institucional"
        className="relative overflow-hidden bg-gradient-to-br from-[#004700] to-[#00A300] py-20 text-white"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[#5CFF5C]/15 blur-3xl"
        />

        <Reveal>
          <div className="relative mx-auto grid max-w-[1260px] gap-10 px-5 sm:px-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:px-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
                Universidad pública
              </span>

              <h2 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                Excelencia académica, investigación e
                innovación
              </h2>
            </div>

            <p className="text-base leading-7 text-white/80 sm:text-lg">
              Comprometidos con el desarrollo sostenible de
              Concepción y del Paraguay.
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}