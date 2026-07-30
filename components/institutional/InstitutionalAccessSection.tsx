import Link from 'next/link';

/* ── Icons ─────────────────────────────────────────────── */

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-7 w-7">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-7 w-7">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-7 w-7">
      <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <path d="M20 11v5" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-7 w-7">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-7 w-7">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

/* ── Data ───────────────────────────────────────────────── */

const ACCESS_ITEMS = [
  {
    id: 'transparencia',
    href: '/transparencia',
    badge: 'Ley 5.189 y 5.282',
    title: 'Transparencia Institucional',
    description:
      'Accedé a la información pública sobre remuneraciones, presupuesto, patrimonio y gestión institucional conforme a la normativa vigente.',
    cta: 'Ver documentos',
    icon: ShieldCheckIcon,
    accent: 'from-emerald-500/20 to-teal-600/10',
    iconColor: 'text-emerald-400',
    featured: true,
  },
  {
    id: 'info-publica',
    href: '/informacion-publica',
    badge: 'Acceso ciudadano',
    title: 'Información Pública',
    description:
      'Solicitar información al Estado conforme a la Ley de Libre Acceso.',
    cta: 'Solicitar información',
    icon: EyeIcon,
    accent: 'from-sky-500/20 to-blue-600/10',
    iconColor: 'text-sky-400',
    featured: false,
  },
  {
    id: 'solicitar-titulo',
    href: '/solicitar-titulo',
    badge: 'Trámite académico',
    title: 'Solicitar Título',
    description:
      'Iniciá el trámite de obtención y legalización de tu diploma académico.',
    cta: 'Iniciar trámite',
    icon: GraduationCapIcon,
    accent: 'from-violet-500/20 to-purple-600/10',
    iconColor: 'text-violet-400',
    featured: false,
  },
  {
    id: 'biblioteca',
    href: '/biblioteca',
    badge: 'Investigación',
    title: 'Biblioteca & Tesis',
    description:
      'Consultá el repositorio de tesis académicas y recursos bibliográficos digitales.',
    cta: 'Explorar repositorio',
    icon: BookOpenIcon,
    accent: 'from-amber-500/20 to-orange-600/10',
    iconColor: 'text-amber-400',
    featured: false,
  },
  {
    id: 'revistas',
    href: '/revistas',
    badge: 'Publicaciones',
    title: 'Revistas Académicas',
    description:
      'Revistas científicas y académicas publicadas por las facultades de la UNC.',
    cta: 'Ver publicaciones',
    icon: JournalIcon,
    accent: 'from-rose-500/20 to-pink-600/10',
    iconColor: 'text-rose-400',
    featured: false,
  },
];

/* ── Card components ────────────────────────────────────── */

function FeaturedCard({ item }: { item: typeof ACCESS_ITEMS[number] }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group relative col-span-1 flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(52,211,153,0.08)] md:col-span-2 lg:col-span-1 xl:col-span-2"
    >
      <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${item.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ${item.iconColor} ring-1 ring-white/10`}>
          <Icon />
        </div>
        <span className="mt-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-white/50">
          {item.badge}
        </span>
      </div>

      <div className="relative mt-6 flex-1">
        <h3 className="text-xl font-bold leading-snug text-white group-hover:text-emerald-300 transition-colors duration-300">
          {item.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          {item.description}
        </p>
      </div>

      <div className={`relative mt-8 flex items-center gap-2 text-sm font-semibold ${item.iconColor}`}>
        {item.cta}
        <ArrowRight />
      </div>
    </Link>
  );
}

function StandardCard({ item }: { item: typeof ACCESS_ITEMS[number] }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]"
    >
      <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${item.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ${item.iconColor} ring-1 ring-white/10`}>
        <Icon />
      </div>

      <div className="relative mt-5 flex-1">
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/35">
          {item.badge}
        </span>
        <h3 className="mt-2 text-base font-bold leading-snug text-white/90 transition-colors duration-300 group-hover:text-white">
          {item.title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          {item.description}
        </p>
      </div>

      <div className={`relative mt-5 flex items-center gap-1.5 text-xs font-semibold ${item.iconColor}`}>
        {item.cta}
        <ArrowRight />
      </div>
    </Link>
  );
}

/* ── Section ────────────────────────────────────────────── */

export default function InstitutionalAccessSection() {
  const [featured, ...rest] = ACCESS_ITEMS;

  return (
    <section
      aria-labelledby="institutional-access-title"
      className="relative overflow-hidden bg-[#071A13] py-20 sm:py-24"
    >
      {/* Background decoration */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-teal-900/20 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(52,211,153,0.06),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Acceso ciudadano
          </span>
          <h2
            id="institutional-access-title"
            className="mt-5 font-serif text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Transparencia e{' '}
            <span className="text-emerald-400">Información</span>{' '}
            Institucional
          </h2>
          <p className="mt-4 text-base leading-7 text-white/50 sm:text-lg">
            Accedé a los documentos públicos, realizá trámites académicos y
            consultá los recursos de investigación de la UNC.
          </p>
        </div>

        {/* Cards grid */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Featured card spans 2 columns on xl */}
          <FeaturedCard item={featured} />

          {/* Standard cards */}
          {rest.map((item) => (
            <StandardCard key={item.id} item={item} />
          ))}
        </div>

        {/* Bottom separator line */}
        <div className="mt-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}
