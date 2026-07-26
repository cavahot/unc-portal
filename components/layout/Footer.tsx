import Image from 'next/image';
import Link from 'next/link';

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
    href: 'https://facebook.com/uncpy',
    icon: 'facebook',
  },
  {
    label: 'X',
    href: 'https://x.com/uncpy',
    icon: 'x',
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/uncpy',
    icon: 'instagram',
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@uncpy',
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

/* =========================================================
   FOOTER PRINCIPAL
   ========================================================= */

export default function Footer() {
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
              aria-label="Ir al inicio de la Universidad Nacional de Concepción"
              className="group inline-flex items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
            >
              <div className="relative h-16 w-16 shrink-0 transition-transform duration-300 group-hover:scale-[1.03] sm:h-[72px] sm:w-[72px]">
                <Image
                  src="/images/logo.png"
                  alt="Logotipo oficial de la Universidad Nacional de Concepción"
                  fill
                  sizes="72px"
                  className="object-contain"
                />
              </div>

              <div>
                <span className="block text-base font-semibold leading-tight text-white">
                  Universidad Nacional
                </span>

                <span className="block text-sm leading-tight text-white/70">
                  de Concepción
                </span>

                <span className="mt-1.5 block text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#8AFF8A]">
                  Marcando el Norte
                </span>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
              Excelencia académica, investigación, innovación y compromiso con
              el desarrollo sostenible del Paraguay.
            </p>

            {/* Redes sociales */}
            <div className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                Redes oficiales
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visitar ${social.label} de la Universidad Nacional de Concepción`}
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
              title="Institucional"
              links={institutionalLinks}
              ariaLabel="Enlaces institucionales"
            />

            <FooterNavigationColumn
              title="Servicios"
              links={serviceLinks}
              ariaLabel="Servicios institucionales"
            />

            <div className="col-span-2 sm:col-span-1">
              <FooterNavigationColumn
                title="Academia"
                links={academicLinks}
                ariaLabel="Enlaces académicos"
              />
            </div>
          </div>

          {/* Contacto institucional */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-white/15 bg-[#001A00]/45 p-5 shadow-[0_22px_48px_-26px_rgba(0,26,0,0.9)] backdrop-blur-sm sm:p-6">
              <span className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#8AFF8A]">
                Rectorado
              </span>

              <h2 className="mt-2 text-lg font-semibold text-white">
                Contacto institucional
              </h2>

              <address className="mt-5 space-y-4 not-italic">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[#8AFF8A]">
                    <LocationIcon />
                  </span>

                  <p className="text-sm leading-6 text-white/70">
                    Km 210, Ruta PY05
                    <br />
                    Concepción, Paraguay
                  </p>
                </div>

                <a
                  href="mailto:contacto@unc.edu.py"
                  className="flex items-center gap-3 rounded-lg text-sm text-white/70 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
                >
                  <span className="shrink-0 text-[#8AFF8A]">
                    <MailIcon />
                  </span>

                  <span className="break-all">
                    contacto@unc.edu.py
                  </span>
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
                Ver información de contacto

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
            © {currentYear} Universidad Nacional de Concepción. Todos los
            derechos reservados.
          </p>

          <nav
            aria-label="Información legal"
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-end"
          >
            <Link
              href="/privacidad"
              className="rounded text-xs text-white/50 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
            >
              Política de privacidad
            </Link>

            <Link
              href="/accesibilidad"
              className="rounded text-xs text-white/50 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
            >
              Accesibilidad
            </Link>

            <Link
              href="/mapa-sitio"
              className="rounded text-xs text-white/50 transition-colors hover:text-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
            >
              Mapa del sitio
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}