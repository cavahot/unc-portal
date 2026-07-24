import Image from 'next/image';
import Link from 'next/link';

const institutionalLinks = [
  { label: 'Autoridades', href: '/institucional/autoridades' },
  { label: 'Historia', href: '/institucional/historia' },
  { label: 'Misión y Visión', href: '/institucional/mision-y-vision' },
  { label: 'Organigrama', href: '/institucional/organigrama' },
];

const serviceLinks = [
  { label: 'Carreras', href: '/carreras' },
  { label: 'Trámites', href: '/tramites' },
  { label: 'Transparencia', href: '/transparencia' },
  { label: 'Contacto', href: '/contacto' },
];

const socialLinks = [
  { label: 'Facebook', href: 'https://facebook.com/uncpy' },
  { label: 'X', href: 'https://x.com/uncpy' },
  { label: 'Instagram', href: 'https://instagram.com/uncpy' },
  { label: 'YouTube', href: 'https://youtube.com/@uncpy' },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Identidad institucional */}
          <div className="lg:pr-6">
            <Link
              href="/"
              aria-label="Ir al inicio de la Universidad Nacional de Concepción"
              className="mb-5 inline-flex items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <div className="relative h-16 w-16 shrink-0 lg:h-20 lg:w-20">
                <Image
                  src="/images/logo.png"
                  alt="Logotipo oficial de la Universidad Nacional de Concepción"
                  fill
                  sizes="(min-width: 1024px) 80px, 64px"
                  className="object-contain"
                />
              </div>

              <div>
                <span className="block text-base font-semibold leading-tight text-white">
                  Universidad Nacional
                </span>
                <span className="block text-sm leading-tight text-white/65">
                  de Concepción
                </span>
                <span className="mt-1 block text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
                  Marcando el Norte
                </span>
              </div>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-white/55">
              Excelencia académica, investigación, innovación y compromiso con
              el desarrollo sostenible del Paraguay.
            </p>
          </div>

          {/* Institucional */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-white">
              Institucional
            </h2>

            <ul className="space-y-2.5">
              {institutionalLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/50 transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:text-amber-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-white">
              Servicios
            </h2>

            <ul className="space-y-2.5">
              {serviceLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/50 transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:text-amber-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-white">
              Contacto
            </h2>

            <address className="space-y-2 text-sm not-italic text-white/50">
              <p>Km 210, Ruta PY05</p>
              <p>Concepción, Paraguay</p>

              <a
                href="mailto:contacto@unc.edu.py"
                className="block transition-colors hover:text-amber-400"
              >
                contacto@unc.edu.py
              </a>

              <a
                href="https://www.unc.edu.py"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors hover:text-amber-400"
              >
                www.unc.edu.py
              </a>
            </address>

            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visitar ${social.label} de la UNC`}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 transition-all hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Franja inferior */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-white/35 sm:text-left">
            © {new Date().getFullYear()} Universidad Nacional de Concepción.
            Todos los derechos reservados.
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="/privacidad"
              className="text-xs text-white/35 transition-colors hover:text-white/70"
            >
              Política de privacidad
            </Link>

            <Link
              href="/accesibilidad"
              className="text-xs text-white/35 transition-colors hover:text-white/70"
            >
              Accesibilidad
            </Link>

            <Link
              href="/mapa-sitio"
              className="text-xs text-white/35 transition-colors hover:text-white/70"
            >
              Mapa del sitio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}