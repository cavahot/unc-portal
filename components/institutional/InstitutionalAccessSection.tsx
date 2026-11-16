// HOME-STATES-01: «Acceso ciudadano» del inicio. Qué hace: cinco accesos institucionales con el texto de los mensajes
// (pages.home.institutionalAccess) y enlaces que conservan el idioma. Por qué: antes el texto estaba fijo en español
// (con voseo) y el Link de next/link llevaba a quien eligió otro idioma a la versión en español. Usa el fondo claro del
// sistema visual en lugar del bloque oscuro anterior.
// Límite: las rutas son fijas (son páginas del portal); los textos se editan en los mensajes, no en el CMS.
import type { ReactNode } from 'react';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getT } from '@/lib/i18n/server';

/* ── Icons ─────────────────────────────────────────────── */

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: 'h-7 w-7',
};

const ICONS: Record<string, ReactNode> = {
  transparencia: (
    <svg {...svgProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  infoPublica: (
    <svg {...svgProps}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  solicitarTitulo: (
    <svg {...svgProps}>
      <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <path d="M20 11v5" />
    </svg>
  ),
  biblioteca: (
    <svg {...svgProps}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  revistas: (
    <svg {...svgProps}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  ),
};

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

/* ── Data ───────────────────────────────────────────────── */

// Solo rutas y orden; los textos viven en los mensajes (clave = `id`).
const ACCESS_ITEMS = [
  { id: 'transparencia', href: '/transparencia', featured: true },
  { id: 'infoPublica', href: '/informacion-publica', featured: false },
  { id: 'solicitarTitulo', href: '/solicitar-titulo', featured: false },
  { id: 'biblioteca', href: '/biblioteca', featured: false },
  { id: 'revistas', href: '/revistas', featured: false },
] as const;

interface ItemText {
  badge: string;
  title: string;
  description: string;
  cta: string;
}

type Item = { id: string; href: string; featured: boolean; text: ItemText };

/* ── Card components ────────────────────────────────────── */

const FOCUS =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]';

function FeaturedCard({ item }: { item: Item }) {
  return (
    <Link
      href={item.href}
      className={`group relative col-span-1 flex flex-col overflow-hidden rounded-2xl border border-[#37D448]/60 bg-[#F4F7F5] p-8 shadow-[0_18px_48px_rgba(7,42,15,0.08)] transition-[border-color,box-shadow] duration-300 hover:border-[#37D448] hover:shadow-[0_30px_65px_rgba(0,71,0,0.17)] md:col-span-2 lg:col-span-1 xl:col-span-2 xl:row-span-2 ${FOCUS}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#00A300] text-white">
          {ICONS[item.id]}
        </div>
        <span className="mt-1 rounded-full border border-[#004700]/20 bg-white px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[#3E4A45]">
          {item.text.badge}
        </span>
      </div>

      <div className="mt-6 flex-1">
        <h3 className="text-xl font-bold leading-snug text-[#004700]">{item.text.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[#3E4A45]">{item.text.description}</p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#006B00]">
        {item.text.cta}
        <ArrowRight />
      </div>
    </Link>
  );
}

function StandardCard({ item }: { item: Item }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-[#D7E0DB] bg-[#F4F7F5] p-6 transition-[border-color,box-shadow] duration-300 hover:border-[#37D448] hover:shadow-[0_20px_45px_rgba(0,71,0,0.14)] ${FOCUS}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E6FFE6] text-[#006B00]">
        {ICONS[item.id]}
      </div>

      <div className="mt-5 flex-1">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#52635E]">
          {item.text.badge}
        </span>
        <h3 className="mt-2 text-base font-bold leading-snug text-[#09231D]">{item.text.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#3E4A45]">{item.text.description}</p>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#006B00]">
        {item.text.cta}
        <ArrowRight />
      </div>
    </Link>
  );
}

/* ── Section ────────────────────────────────────────────── */

export default async function InstitutionalAccessSection() {
  const locale = await getLocale();
  const t = await getT(locale, 'pages.home');

  const items: Item[] = ACCESS_ITEMS.map((i) => ({
    ...i,
    text: {
      badge: t(`institutionalAccess.items.${i.id}.badge`),
      title: t(`institutionalAccess.items.${i.id}.title`),
      description: t(`institutionalAccess.items.${i.id}.description`),
      cta: t(`institutionalAccess.items.${i.id}.cta`),
    },
  }));
  const [featured, ...rest] = items;

  return (
    <section
      aria-labelledby="institutional-access-title"
      className="relative overflow-hidden bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#006B00]">
            {t('institutionalAccess.label')}
          </span>
          <h2
            id="institutional-access-title"
            className="mt-4 font-serif text-3xl font-bold leading-tight tracking-tight text-[#09231D] sm:text-4xl lg:text-5xl"
          >
            {t('institutionalAccess.title')}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#3E4A45] sm:text-lg">
            {t('institutionalAccess.description')}
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
      </div>
    </section>
  );
}
