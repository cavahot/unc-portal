import Image from 'next/image';
import Link from 'next/link';
import { getT } from '@/lib/i18n/server';

type FooterLinkItem = {
  label: string;
  href: string;
};

type SocialNetwork =
  | 'facebook'
  | 'x'
  | 'instagram'
  | 'youtube';

type SocialLinkItem = {
  label: string;
  href: string;
  icon: SocialNetwork;
};

/* =========================================================
   ENLACES DEL FOOTER
   ========================================================= */

const institutionalLinks: FooterLinkItem[] = [
  {
    label: 'Autoridades',
    href: '/institucional/autoridades',
  },
  {
    label: 'Historia',
    href: '/institucional/historia',
  },
  {
    label: 'Misión y Visión',
    href: '/institucional/mision-y-vision',
  },
  {
    label: 'Organigrama',
    href: '/institucional/organigrama',
  },
];

const serviceLinks: FooterLinkItem[] = [
  {
    label: 'Carreras',
    href: '/carreras',
  },
  {
    label: 'Trámites',
    href: '/tramites',
  },
  {
    label: 'Transparencia',
    href: '/transparencia',
  },
  {
    label: 'Contacto',
    href: '/contacto',
  },
];

const academicLinks: FooterLinkItem[] = [
  {
    label: 'Investigación',
    href: '/investigacion',
  },
  {
    label: 'Extensión universitaria',
    href: '/extension',
  },
  {
    label: 'Noticias',
    href: '/noticias',
  },
  {
    label: 'Calendario académico',
    href: '/calendario-academico',
  },
];

const socialLinks: SocialLinkItem[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/people/unc_py/100089915906133/?mibextid=ZbWKwL',
    icon: 'facebook',
  },
  {
    label: 'X',
    href: 'https://x.com/UncConcepcion',
    icon: 'x',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/unc_py/',
    icon: 'instagram',
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@universidadnacionaldeconce5302?si=o_PW3t0JmcZLeKrS',
    icon: 'youtube',
  },
];

/* =========================================================
   ICONOS GENERALES
   ========================================================= */

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-3.5 w-3.5"
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

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 21s7-5.3 7-12a7 7 0 10-14 0c0 6.7 7 12 7 12z"
      />

      <circle
        cx="12"
        cy="9"
        r="2.3"
        strokeWidth={1.8}
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        strokeWidth={1.8}
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 7l8 6 8-6"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1l-1.3 1.3a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        strokeWidth={1.8}
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12s1.2 6.5 3.5 9"
      />
    </svg>
  );
}

/* =========================================================
   ICONOS DE REDES SOCIALES
   ========================================================= */

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d="M13.6 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3H6.7V13h3.1v9h3.8z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[18px] w-[18px]"
    >
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.26-8.3L3 2h6.4l4.42 5.84L18.9 2zm-1.1 17.84h1.72L8.46 4.05H6.61L17.8 19.84z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        strokeWidth={1.8}
      />

      <circle
        cx="12"
        cy="12"
        r="4"
        strokeWidth={1.8}
      />

      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="4"
        strokeWidth={1.8}
      />

      <path
        d="M10 9l5 3-5 3V9z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function SocialIcon({
  icon,
}: {
  icon: SocialNetwork;
}) {
  switch (icon) {
    case 'facebook':
      return <FacebookIcon />;

    case 'x':
      return <XIcon />;

    case 'instagram':
      return <InstagramIcon />;

    case 'youtube':
      return <YouTubeIcon />;

    default:
      return null;
  }
}

/* =========================================================
   COMPONENTES DE NAVEGACIÓN
   ========================================================= */

function FooterNavigationLink({
  item,
}: {
  item: FooterLinkItem;
}) {
  return (
    <Link
      href={item.href}
      className="group inline-flex items-center gap-2 rounded-md py-1 text-sm text-white/65 transition-colors duration-200 hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
    >
      <span>{item.label}</span>

      <span className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        <ArrowIcon />
      </span>
    </Link>
  );
}

function FooterNavigationColumn({
  title,
  links,
  ariaLabel,
}: {
  title: string;
  links: FooterLinkItem[];
  ariaLabel: string;
}) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-white">
        {title}
      </h2>

      <nav aria-label={ariaLabel}>
        <ul className="space-y-1.5">
          {links.map((item) => (
            <li key={item.href}>
              <FooterNavigationLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function MiticLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 36"
      className="h-9 w-auto"
      aria-hidden="true"
    >
      {/* Simplified shield */}
      <path
        d="M8 4 L16 2 L24 4 L26 14 C26 22 16 28 16 28 C16 28 6 22 6 14 Z"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.2"
      />
      <path
        d="M11 13 l3 3 5-5"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* MITIC text */}
      <text x="32" y="17" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.85)">MITIC</text>
      <text x="32" y="27" fontFamily="sans-serif" fontSize="6.5" fill="rgba(255,255,255,0.5)">Gobierno del Paraguay</text>
    </svg>
  );
}

/* =========================================================
   FOOTER PRINCIPAL
   ========================================================= */

export default async function Footer({ locale }: { locale: string }) {
  const t = await getT(locale, 'common');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden bg-[#004700] text-white">
      {/* Línea superior institucional */}
      <div className="h-1 bg-gradient-to-r from-[#001A00] via-[#00A300] to-[#001A00]" />

      {/* Decoración de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-8 -z-10 h-96 w-96 rounded-full bg-[#00A300]/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#001A00]/35 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-52 w-52 -translate-x-1/2 rounded-full bg-[#5CFF5C]/10 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Identidad institucional */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              aria-label={t('goHome')}
              className="group inline-flex items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
            >
              <div className="relative h-16 w-16 shrink-0 transition-transform duration-300 group-hover:scale-[1.03] sm:h-[72px] sm:w-[72px]">
                <Image
                  src="/images/logo.png"
                  alt={t('officialLogo')}
                  fill
                  sizes="72px"
                  className="object-contain"
                />
              </div>

              <div>
                <span className="block text-base font-semibold leading-tight text-white">
                  {t('universidadNacional')}
                </span>

                <span className="block text-sm leading-tight text-white/70">
                  {t('deConcepcion')}
                </span>

                <span className="mt-1.5 block text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#8AFF8A]">
                  {t('tagline')}
                </span>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
              {t('institutionalDescription')}
            </p>

            {/* Social networks */}
            <div className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                {t('socialNetworks')}
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('visitSocial', { network: social.label })}
                    title={social.label}
                    className="social-icon-button"
                  >
                    <SocialIcon icon={social.icon} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Navegación institucional */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:col-span-5">
            <FooterNavigationColumn
              title={t('institutional')}
              links={institutionalLinks}
              ariaLabel={t('institutional')}
            />

            <FooterNavigationColumn
              title={t('services')}
              links={serviceLinks}
              ariaLabel={t('services')}
            />

            <div className="col-span-2 sm:col-span-1">
              <FooterNavigationColumn
                title={t('academia')}
                links={academicLinks}
                ariaLabel={t('academia')}
              />
            </div>
          </div>

          {/* Contacto institucional */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-white/15 bg-[#001A00]/45 p-5 shadow-[0_22px_48px_-26px_rgba(0,26,0,0.9)] backdrop-blur-sm sm:p-6">
              <span className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#8AFF8A]">
                {t('rectorado')}
              </span>

              <h2 className="mt-2 text-lg font-semibold text-white">
                {t('contactInstitutional')}
              </h2>

              <address className="mt-5 space-y-4 not-italic">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[#8AFF8A]">
                    <LocationIcon />
                  </span>

                  <p className="text-sm leading-6 text-white/70" style={{ whiteSpace: 'pre-line' }}>
                    {t('address')}
                  </p>
                </div>

                <a
                  href="mailto:secgral@unc.edu.py"
                  className="flex items-center gap-3 rounded-lg text-sm text-white/70 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  <span className="shrink-0 text-[#8AFF8A]">
                    <MailIcon />
                  </span>

                  <span className="break-all">
                    secgral@unc.edu.py
                  </span>
                </a>

                <a
                  href="tel:+5953312410690"
                  className="flex items-center gap-3 rounded-lg text-sm text-white/70 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  <span className="shrink-0 text-[#8AFF8A]">
                    <PhoneIcon />
                  </span>

                  <span>(595 331) 241069 – 240883</span>
                </a>

                <a
                  href="https://www.unc.edu.py"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg text-sm text-white/70 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  <span className="shrink-0 text-[#8AFF8A]">
                    <GlobeIcon />
                  </span>

                  <span>www.unc.edu.py</span>
                </a>
              </address>

              <Link
                href="/contacto"
                  className="footer-contact-button group mt-6"              >
                {t('seeContactInfo')}

                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Barra legal inferior */}
        <div className="mt-10 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs leading-5 text-white/50 sm:text-left">
            {t('allRightsReserved', { year: currentYear })}
          </p>

          <nav
            aria-label={t('legalInfo')}
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-end"
          >
            <Link
              href="/privacidad"
              className="rounded text-xs text-white/50 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
            >
              {t('privacyPolicy')}
            </Link>

            <Link
              href="/accesibilidad"
              className="rounded text-xs text-white/50 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
            >
              {t('accessibility')}
            </Link>

            <Link
              href="/mapa-sitio"
              className="rounded text-xs text-white/50 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
            >
              {t('sitemap')}
            </Link>
          </nav>

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <p className="text-center text-[0.6rem] text-white/30 sm:text-right">
              {t('miticStandard')}{' '}
              <a
                href="https://mitic.gov.py/materiales/norma-de-gobierno-linea-grafica/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white/60"
              >
                {t('miticStandardLink')}
              </a>
            </p>
            <a
              href="https://mitic.gov.py/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('miticAriaLabel')}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <MiticLogo />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}