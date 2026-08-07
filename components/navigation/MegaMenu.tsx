'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/layout/LocaleSwitcher';
import { createPortal } from 'react-dom';
import {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Navegacion } from '@unc/cms-types';

interface MenuItem {
  label: string;
  href: string;
  description?: string;
  children?: MenuItem[];
}

interface MegaMenuProps {
  navigation?: Navegacion;
}

/**
 * Resolves a CMS navigation link to a portal href.
 * - `manual` links use the stored URL as-is.
 * - `relationship` links resolve to the related Pagina's full-path slug.
 */
function resolveHref(link: {
  type: 'manual' | 'relationship';
  url?: string | null;
  page?: number | { slug: string } | null;
}): string {
  if (link.type === 'relationship' && link.page && typeof link.page === 'object') {
    return `/${link.page.slug}`;
  }

  return link.url || '#';
}

function mapCmsNavigation(navigation: Navegacion): MenuItem[] {
  return (navigation.links || []).map((link) => ({
    label: link.label,
    href: resolveHref(link),
    children: (link.children || []).map((child) => ({
      label: child.label,
      href: resolveHref(child),
    })),
  }));
}

const fallbackMenuData: MenuItem[] = [
  {
    label: 'Inicio',
    href: '/',
  },
  {
    label: 'Institucional',
    href: '/institucional',
    children: [
      { label: 'Historia', href: '/historia' },
      { label: 'Misión, Visión y Valores', href: '/mision-vision-y-valores' },
      { label: 'Marco Legal', href: '/marco-legal' },
      { label: 'Organigrama', href: '/organigrama' },
      { label: 'Autoridades', href: '/autoridades' },
      { label: 'Ley 5189/2014', href: '/ley-5189' },
      { label: 'Ley 5282/2014', href: '/ley-5282' },
      { label: 'Transparencia', href: '/transparencia' },
      { label: 'Información Pública', href: '/informacion-publica' },
      { label: 'Trámites', href: '/tramites' },
      { label: 'Títulos', href: '/titulos' },
      { label: 'Solicitar Título', href: '/solicitar-titulo' },
      { label: 'Legalizaciones', href: '/legalizaciones' },
      { label: 'Convenios', href: '/convenios' },
      { label: 'Tribunal Electoral', href: '/tribunal-electoral' },
    ],
  },
  {
    label: 'Facultades',
    href: '#',
    children: [
      { label: 'Facultad de Odontología', href: '/facultades/odontologia' },
      { label: 'Facultad de Medicina', href: '/facultades/medicina' },
      { label: 'Facultad de Ciencias Agrarias', href: '/facultades/agrarias' },
      { label: 'Facultad de Ciencias Exactas y Tecnológicas', href: '/facultades/ciencias-exactas' },
      { label: 'Facultad de Humanidades y Ciencias de la Educación', href: '/facultades/humanidades' },
      { label: 'Facultad de Ciencias Económicas y Administrativas', href: '/facultades/ciencias-economicas' },
      { label: 'Aranceles Rectorado', href: '/aranceles-rectorado' },
    ],
  },
  {
    label: 'Noticias',
    href: '/noticias',
  },
  {
    label: 'Preguntas Frecuentes',
    href: 'https://www.unc.edu.py/preguntas-frecuentes/',
  },
  {
    label: 'Contactos',
    href: '/contacto',
    children: [
      { label: 'Contactos por dependencia', href: '/contacto#dependencias' },
    ],
  },
  {
    label: 'Academia',
    href: '#',
    children: [
      { label: 'Dirección General Académica', href: 'https://www.unc.edu.py/direccion-general-academica/' },
      { label: 'Aseguramiento de la Calidad', href: 'https://www.unc.edu.py/aseguramiento-de-la-calidad/' },
      { label: 'Investigación', href: 'https://www.unc.edu.py/investigacion/' },
      { label: 'Extensión y Vinculación', href: 'https://www.unc.edu.py/extension-y-vinculacion/' },
      { label: 'Bienestar Institucional', href: 'https://www.unc.edu.py/bienestar-institucional/' },
      { label: 'Revistas Académicas', href: '/revistas' },
      { label: 'Biblioteca Digital', href: '/biblioteca' },
    ],
  },
];

function ChevronIcon({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
        expanded ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function SearchIcon() {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function normalizePath(href: string) {
  return href.split('?')[0];
}

function isExternal(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

export default function MegaMenu({ navigation }: MegaMenuProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const menuData =
    navigation && navigation.links && navigation.links.length > 0
      ? mapCmsNavigation(navigation)
      : fallbackMenuData;

  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [mobileSection, setMobileSection] =
    useState<number | null>(null);

  const [mounted, setMounted] =
    useState(false);

  const menuRef = useRef<HTMLElement>(null);

  const mobilePanelRef =
    useRef<HTMLDivElement>(null);

  const mobileToggleRef =
    useRef<HTMLButtonElement>(null);

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Habilita el portal únicamente después de montar
   * el componente en el navegador.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Cierra los menús cuando cambia la ruta.
   */
  useEffect(() => {
    setActiveIndex(null);
    setMobileOpen(false);
    setMobileSection(null);
  }, [pathname]);

  /*
   * Cierre mediante tecla Escape.
   */
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setActiveIndex(null);
      setMobileSection(null);

      if (mobileOpen) {
        setMobileOpen(false);

        window.setTimeout(() => {
          mobileToggleRef.current?.focus();
        }, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [mobileOpen]);

  /*
   * Cierra el desplegable de escritorio al hacer clic
   * fuera del componente.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setActiveIndex(null);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      );
    };
  }, []);

  /*
   * Bloquea el desplazamiento de la página cuando
   * el menú móvil está abierto.
   */
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const firstFocusable =
        mobilePanelRef.current?.querySelector<HTMLElement>(
          '[data-mobile-autofocus]',
        );

      firstFocusable?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  /*
   * Limpia el temporizador del menú de escritorio.
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isPathActive = (href: string) => {
    const normalizedHref = normalizePath(href);

    if (normalizedHref === '/') {
      return pathname === '/';
    }

    return (
      pathname === normalizedHref ||
      pathname.startsWith(`${normalizedHref}/`)
    );
  };

  const openMenu = (index: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setActiveIndex(index);
  };

  const closeDesktopMenu = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setActiveIndex(null);
  };

  const scheduleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 160);
  };

  const openMobileMenu = () => {
    setActiveIndex(null);
    setMobileOpen(true);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileSection(null);

    window.setTimeout(() => {
      mobileToggleRef.current?.focus();
    }, 0);
  };

  /*
   * Mantiene el foco dentro del diálogo móvil.
   */
  const handleMobileKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== 'Tab') {
      return;
    }

    const panel = mobilePanelRef.current;

    if (!panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        [
          'a[href]',
          'button:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(','),
      ),
    ).filter((element) => {
      return element.offsetParent !== null;
    });

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement =
      focusableElements[focusableElements.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === firstElement
    ) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (
      !event.shiftKey &&
      document.activeElement === lastElement
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <nav
      ref={menuRef}
      aria-label={t('ariaLabel')}
      className="relative flex justify-end"
    >
      {/* Navegación de escritorio */}
      <ul className="hidden items-center gap-0.5 xl:flex">
        {menuData.map((item, index) => {
          const hasChildren =
            Boolean(item.children?.length);

          const isExpanded =
            activeIndex === index;

          const isCurrent =
            isPathActive(item.href);

          const alignRight =
            index >= menuData.length - 3;

          const triggerId =
            `desktop-menu-trigger-${index}`;

          const panelId =
            `desktop-menu-panel-${index}`;

          return (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => {
                if (hasChildren) {
                  openMenu(index);
                }
              }}
              onMouseLeave={scheduleClose}
              onBlur={(event) => {
                const nextTarget =
                  event.relatedTarget as Node | null;

                if (
                  nextTarget &&
                  event.currentTarget.contains(nextTarget)
                ) {
                  return;
                }

                scheduleClose();
              }}
            >
              {hasChildren ? (
                <button
                  id={triggerId}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  aria-current={
                    isCurrent ? 'page' : undefined
                  }
                  onFocus={() => openMenu(index)}
                  onClick={() => {
                    setActiveIndex(
                      isExpanded ? null : index,
                    );
                  }}
                  className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-2.5 text-[0.76rem] font-medium transition-all duration-200 2xl:px-3 2xl:text-[0.82rem] ${
                    isExpanded || isCurrent
                      ? 'bg-unc-600/[0.18] text-unc-300'
                      : 'text-white/75 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  {item.label}

                  <span className="ml-1">
                    <ChevronIcon
                      expanded={isExpanded}
                    />
                  </span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  aria-current={
                    isCurrent ? 'page' : undefined
                  }
                  onFocus={closeDesktopMenu}
                  {...(isExternal(item.href) && { target: '_blank', rel: 'noopener noreferrer' })}
                  className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-2.5 text-[0.76rem] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300 2xl:px-3 2xl:text-[0.82rem] ${
                    isCurrent
                      ? 'bg-unc-600/[0.18] text-unc-300'
                      : 'text-white/75 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )}

              {hasChildren && isExpanded && (
                <div
                  id={panelId}
                  aria-labelledby={triggerId}
                  onMouseEnter={() => openMenu(index)}
                  onMouseLeave={scheduleClose}
                  className={`glass-panel absolute top-[calc(100%+0.7rem)] z-[60] w-[510px] p-3 ${
                    alignRight ? 'right-0' : 'left-0'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between border-b border-white/10 px-3 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>

                      <p className="mt-0.5 text-xs text-white/45">
                        {t('relatedLinks')}
                      </p>
                    </div>

                    <Link
                      href={item.href}
                      onClick={closeDesktopMenu}
                      {...(isExternal(item.href) && { target: '_blank', rel: 'noopener noreferrer' })}
                      className="rounded-full border border-unc-400/25 bg-unc-600/10 px-3 py-1.5 text-xs font-medium text-unc-300 transition-colors hover:bg-unc-600/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300"
                    >
                      {t('viewSection')}
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {item.children?.map((child) => {
                      const childIsCurrent =
                        isPathActive(child.href);

                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          aria-current={
                            childIsCurrent
                              ? 'page'
                              : undefined
                          }
                          onClick={closeDesktopMenu}
                          {...(isExternal(child.href) && { target: '_blank', rel: 'noopener noreferrer' })}
                          className={`group rounded-xl p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300 ${
                            childIsCurrent
                              ? 'bg-unc-600/[0.16]'
                              : 'hover:bg-white/[0.07]'
                          }`}
                        >
                          <span
                            className={`block text-sm font-medium transition-colors ${
                              childIsCurrent
                                ? 'text-unc-300'
                                : 'text-white group-hover:text-unc-300'
                            }`}
                          >
                            {child.label}
                          </span>

                          {child.description && (
                            <span className="mt-1 block text-xs leading-relaxed text-white/50">
                              {child.description}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Activador móvil */}
      <button
        ref={mobileToggleRef}
        type="button"
        onClick={openMobileMenu}
        aria-expanded={mobileOpen}
        aria-controls="mobile-main-menu"
        aria-label={t('openMenu')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition-colors hover:border-unc-400/30 hover:bg-unc-600/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300 xl:hidden"
      >
        <MenuIcon />
      </button>

      {/* Menú móvil mediante portal */}
      {mounted &&
        mobileOpen &&
        createPortal(
          <div
            ref={mobilePanelRef}
            id="mobile-main-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('mainMenu')}
            onKeyDown={handleMobileKeyDown}
            className="fixed inset-0 z-[100] h-[100dvh] min-h-screen overflow-hidden bg-[#050d0a] xl:hidden"
          >
            {/* Cabecera móvil */}
            <div className="flex h-[72px] items-center justify-between border-b border-white/10 bg-[#050d0a] px-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {t('mainMenu')}
                </p>

                <p className="mt-0.5 text-xs text-white/45">
                  Universidad Nacional de Concepción
                </p>
              </div>

              <button
                type="button"
                data-mobile-autofocus
                onClick={closeMobileMenu}
                aria-label={t('closeMenu')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition-colors hover:border-unc-400/30 hover:bg-unc-600/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Contenido desplazable */}
            <div className="h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain px-4 py-5">
              <div className="mx-auto max-w-2xl pb-12">
                {/* Selector de idioma */}
                <div className="mb-4 flex justify-center">
                  <LocaleSwitcher />
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2">
                  <a
                    href="https://aula.unc.edu.py"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('aulaVirtualAriaLabel')}
                    className="pill-button pill-button-secondary px-4 py-3 text-xs"
                  >
                    {t('aulaVirtual')}
                  </a>

                  <a
                    href="https://intranet.unc.edu.py"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('intranetAriaLabel')}
                    className="pill-button pill-button-primary px-4 py-3 text-xs"
                  >
                    {t('intranet')}
                  </a>
                </div>

                <ul className="space-y-2">
                  {menuData.map((item, index) => {
                    const hasChildren =
                      Boolean(item.children?.length);

                    const expanded =
                      mobileSection === index;

                    const isCurrent =
                      isPathActive(item.href);

                    const sectionId =
                      `mobile-menu-section-${index}`;

                    return (
                      <li
                        key={item.label}
                        className={`overflow-hidden rounded-2xl border ${
                          isCurrent
                            ? 'border-unc-400/30 bg-unc-600/[0.10]'
                            : 'border-white/[0.08] bg-white/[0.04]'
                        }`}
                      >
                        {hasChildren ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileSection(
                                  expanded ? null : index,
                                );
                              }}
                              aria-expanded={expanded}
                              aria-controls={sectionId}
                              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-unc-300"
                            >
                              <span>{item.label}</span>

                              <span className="text-unc-300">
                                <ChevronIcon
                                  expanded={expanded}
                                />
                              </span>
                            </button>

                            {expanded && (
                              <div
                                id={sectionId}
                                className="border-t border-white/[0.08] px-3 pb-3 pt-2"
                              >
                                <Link
                                  href={item.href}
                                  onClick={closeMobileMenu}
                                  className="mb-1 block rounded-xl bg-unc-600/[0.15] px-3 py-3 text-sm font-medium text-unc-300 transition-colors hover:bg-unc-600/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300"
                                >
                                  {t('viewMainSection')}
                                </Link>

                                {item.children?.map(
                                  (child) => {
                                    const childIsCurrent =
                                      isPathActive(
                                        child.href,
                                      );

                                    return (
                                      <Link
                                        key={child.label}
                                        href={child.href}
                                        onClick={
                                          closeMobileMenu
                                        }
                                        aria-current={
                                          childIsCurrent
                                            ? 'page'
                                            : undefined
                                        }
                                        className={`block rounded-xl px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300 ${
                                          childIsCurrent
                                            ? 'bg-white/[0.06] text-unc-300'
                                            : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                                        }`}
                                      >
                                        <span className="block font-medium">
                                          {child.label}
                                        </span>

                                        {child.description && (
                                          <span className="mt-1 block text-xs leading-relaxed text-white/40">
                                            {
                                              child.description
                                            }
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={closeMobileMenu}
                            aria-current={
                              isCurrent
                                ? 'page'
                                : undefined
                            }
                            className={`block px-4 py-4 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-unc-300 ${
                              isCurrent
                                ? 'text-unc-300'
                                : 'text-white hover:bg-white/[0.04]'
                            }`}
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href="/buscar"
                  onClick={closeMobileMenu}
                  className="mt-5 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:border-unc-400/30 hover:bg-unc-600/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unc-300"
                >
                  <SearchIcon />
                  {t('searchInPortal')}
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </nav>
  );
}