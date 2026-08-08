import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'

export const metadata: Metadata = {
  title: 'Contactos por dependencia',
  description:
    'Directorios de contacto de Rectorado y todas las facultades de la Universidad Nacional de Concepción: teléfonos, correos y sitios web institucionales.',
}

/* =========================================================
   DATA
   ========================================================= */

interface Location {
  name?: string
  address: string
  phones: string[]
  emails: string[]
  web?: string
}

interface Department {
  id: string
  name: string
  logo: string        // path relative to /public
  logoBg?: string     // bg color for the logo container
  locations: Location[]
}

const DEPARTMENTS: Department[] = [
  {
    id: 'rectorado',
    name: 'Rectorado',
    logo: '/images/campus-3d/logo-unc.png',
    logoBg: 'bg-[#004700]',
    locations: [
      {
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 241069', '(595 331) 240883'],
        emails: ['uncrectorado@gmail.com', 'secgral@unc.edu.py'],
      },
    ],
  },
  {
    id: 'odontologia',
    name: 'Facultad de Odontología',
    logo: '/images/facultades/odontologia.png',
    logoBg: 'bg-white',
    locations: [
      {
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 241680'],
        emails: ['decanatofo@unc.edu.py', 'secretariagralfo@unc.edu.py'],
        web: 'http://www.founc.edu.py',
      },
    ],
  },
  {
    id: 'agrarias',
    name: 'Facultad de Ciencias Agrarias',
    logo: '/images/facultades/agrarias.png',
    logoBg: 'bg-white',
    locations: [
      {
        name: 'Sede Concepción — Campus Universitario',
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 241813'],
        emails: ['secgralfcaunc@gmail.com', 'fca-unc@fca-unc.edu.py'],
        web: 'http://www.fca-unc.edu.py',
      },
      {
        name: 'Filial Horqueta',
        address: 'Av. Capitán Gumercindo Sosa c/ Ruta V "Gral. Bernardino Caballero", Horqueta',
        phones: ['(595 332) 222133'],
        emails: [],
      },
    ],
  },
  {
    id: 'economicas',
    name: 'Facultad de Ciencias Económicas y Administrativas',
    logo: '/images/facultades/economicas.png',
    logoBg: 'bg-white',
    locations: [
      {
        name: 'Sede Concepción — Campus Universitario',
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 241749'],
        emails: ['secretariageneral@fcea-unc.edu.py'],
        web: 'http://www.fcea-unc.edu.py',
      },
      {
        name: 'Filial Horqueta',
        address: 'Av. Capitán Gumercindo Sosa c/ Ruta V "Gral. Bernardino Caballero", Horqueta',
        phones: ['(595 332) 222133'],
        emails: [],
      },
    ],
  },
  {
    id: 'medicina',
    name: 'Facultad de Medicina',
    logo: '/images/facultades/medicina.png',
    logoBg: 'bg-white',
    locations: [
      {
        name: 'Campus Universitario',
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 242591', '(595 331) 241022'],
        emails: ['fm-secretariageneral@unc.edu.py', 'facultadunc@hotmail.com'],
        web: 'http://www.fmedicina-unc.edu.py',
      },
      {
        name: 'Predio Hospital Regional',
        address: 'Prof. Guillermo Cabral y Dr. Marcial Royg Bernal, Concepción',
        phones: [],
        emails: [],
      },
    ],
  },
  {
    id: 'humanidades',
    name: 'Facultad de Humanidades y Ciencias de la Educación',
    logo: '/images/facultades/humanidades.png',
    logoBg: 'bg-white',
    locations: [
      {
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 243176'],
        emails: ['secgral@fhyce.edu.py', 'administracion@fhyce.edu.py'],
        web: 'http://www.fhyce.edu.py',
      },
    ],
  },
  {
    id: 'exactas',
    name: 'Facultad de Ciencias Exactas y Tecnológicas',
    logo: '/images/facultades/exactas.png',
    logoBg: 'bg-white',
    locations: [
      {
        address: 'Ruta V Gral. Bernardino Caballero Km 2, Concepción',
        phones: ['(595 331) 243361'],
        emails: ['academicofacet@unc.edu.py', 'decanatofacet@unc.edu.py'],
        web: 'http://www.facet-unc.edu.py',
      },
    ],
  },
]

/* =========================================================
   ICONS
   ========================================================= */

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M12 21s7-5.3 7-12a7 7 0 10-14 0c0 6.7 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1l-1.3 1.3a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  )
}

function IconWeb() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  )
}

/* =========================================================
   LOCATION CARD
   ========================================================= */

function LocationCard({ loc }: { loc: Location }) {
  return (
    <div className="rounded-xl border border-[#D7E0DB] bg-white p-5 shadow-sm">
      {loc.name && (
        <p className="mb-3 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#008000]">
          {loc.name}
        </p>
      )}
      <ul className="space-y-2.5 text-sm text-[#3A4A42]">
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 text-[#008000]"><IconLocation /></span>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="leading-snug hover:text-[#004700] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] rounded"
          >
            {loc.address}
          </a>
        </li>
        {loc.phones.map((p) => (
          <li key={p} className="flex items-center gap-2.5">
            <span className="text-[#008000]"><IconPhone /></span>
            <a href={`tel:${p.replace(/\D/g, '')}`} className="hover:text-[#004700] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] rounded">
              {p}
            </a>
          </li>
        ))}
        {loc.emails.map((e) => (
          <li key={e} className="flex min-w-0 items-center gap-2.5">
            <span className="text-[#008000]"><IconMail /></span>
            <a href={`mailto:${e}`} className="truncate hover:text-[#004700] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] rounded">
              {e}
            </a>
          </li>
        ))}
        {loc.web && (
          <li className="flex items-center gap-2.5">
            <span className="text-[#008000]"><IconWeb /></span>
            <a href={loc.web} target="_blank" rel="noopener noreferrer" className="hover:text-[#004700] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] rounded">
              {loc.web.replace(/^https?:\/\//, '')}
            </a>
          </li>
        )}
      </ul>
    </div>
  )
}

/* =========================================================
   DEPARTMENT CARD
   ========================================================= */

function DepartmentCard({ dept, index }: { dept: Department; index: number }) {
  const isRectorado = dept.id === 'rectorado'

  return (
    <Reveal delay={index * 60}>
      <article
        id={`dept-${dept.id}`}
        aria-labelledby={`dept-title-${dept.id}`}
        className={`overflow-hidden rounded-[1.25rem] border shadow-[0_12px_36px_rgba(7,42,15,0.07)] ${
          isRectorado ? 'border-[#008000]/30' : 'border-[#D7E0DB]'
        } bg-white`}
      >
        {/* ── Header ── */}
        <div className={`flex items-center gap-4 px-6 py-5 ${isRectorado ? 'bg-[#004700]' : 'bg-[#F4F7F5]'}`}>
          {/* Logo */}
          <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ${isRectorado ? 'bg-white/10' : (dept.logoBg ?? 'bg-white')} p-1.5 ring-1 ${isRectorado ? 'ring-white/20' : 'ring-[#D7E0DB]'}`}>
            <Image
              src={dept.logo}
              alt={`Logo ${dept.name}`}
              fill
              sizes="56px"
              className="object-contain p-0.5"
            />
          </div>

          {/* Name */}
          <h2
            id={`dept-title-${dept.id}`}
            className={`font-serif text-base font-bold leading-snug sm:text-lg ${
              isRectorado ? 'text-white' : 'text-[#09231D]'
            }`}
          >
            {dept.name}
          </h2>
        </div>

        {/* ── Locations ── */}
        <div className={`p-5 ${dept.locations.length > 1 ? 'grid gap-4 sm:grid-cols-2' : ''}`}>
          {dept.locations.map((loc, i) => (
            <LocationCard key={i} loc={loc} />
          ))}
        </div>
      </article>
    </Reveal>
  )
}

/* =========================================================
   PAGE
   ========================================================= */

export default function ContactosDependenciasPage() {
  return (
    <>
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-xs text-white/60">
              <li>
                <Link href="/" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li>
                <Link href="/contacto" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5CFF5C]">
                  Contacto
                </Link>
              </li>
              <li aria-hidden="true" className="select-none">/</li>
              <li className="font-semibold text-white" aria-current="page">Por dependencia</li>
            </ol>
          </nav>

          <Reveal>
            <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#B8FFB8]">
              Directorio institucional
            </span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              Contactos por<br className="hidden sm:block" /> dependencia
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Encontrá los datos de contacto del Rectorado y todas las facultades de la Universidad
              Nacional de Concepción: teléfonos, correos electrónicos y sitios web institucionales.
            </p>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          DIRECTORY
          ===================================================== */}
      <section aria-label="Directorio de contactos" className="bg-[#F4F7F5] py-16 sm:py-20">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">

          {/* Quick nav chips */}
          <Reveal>
            <nav aria-label="Saltar a dependencia" className="mb-10 flex flex-wrap gap-2">
              {DEPARTMENTS.map((d) => (
                <a
                  key={d.id}
                  href={`#dept-${d.id}`}
                  className="rounded-full border border-[#D7E0DB] bg-white px-4 py-1.5 text-xs font-semibold text-[#3A4A42] shadow-sm transition-all hover:border-[#37D448]/60 hover:text-[#004700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  {d.name}
                </a>
              ))}
            </nav>
          </Reveal>

          {/* Cards grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {DEPARTMENTS.map((dept, i) => (
              <DepartmentCard key={dept.id} dept={dept} index={i} />
            ))}
          </div>

          {/* Back */}
          <Reveal delay={200}>
            <div className="mt-12 text-center">
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 rounded-full bg-[#004700] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#003300] hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M19 12H5m7-7-7 7 7 7" />
                </svg>
                Volver a la página de contacto
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
