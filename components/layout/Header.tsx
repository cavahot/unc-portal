'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import type { Navegacion } from '@unc/cms-types';
import MegaMenu from '@/components/navigation/MegaMenu';
import LocaleSwitcher from '@/components/layout/LocaleSwitcher';

interface HeaderProps {
  navigation?: Navegacion;
}

export default function Header({ navigation }: HeaderProps) {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#004700] text-white transition-shadow duration-300 ${
        scrolled
          ? 'shadow-[0_14px_40px_-20px_rgba(0,26,0,0.9)]'
          : 'shadow-[0_8px_24px_-20px_rgba(0,26,0,0.55)]'
      }`}
    >
      {/* Enlace de accesibilidad */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:inline-flex focus:items-center focus:rounded-full focus:border focus:border-[#5CFF5C] focus:bg-[#E6FFE6] focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#001A00] focus:shadow-lg"
      >
        {t('skipLink')}
      </a>

      <div className="mx-auto max-w-[1560px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[72px] items-center gap-3 xl:h-20">
          {/* Identidad institucional */}
          <Link
            href="/"
            aria-label={t('homeAriaLabel')}
            className="group flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
          >
            <div className="relative h-12 w-12 shrink-0 transition-transform duration-300 group-hover:scale-[1.04] xl:h-14 xl:w-14">
              <Image
                src="/images/logo.png"
                alt={t('logoAlt')}
                fill
                priority
                sizes="(min-width: 1280px) 56px, 48px"
                className="object-contain"
              />
            </div>

            <div className="hidden 2xl:block">
              <span className="block whitespace-nowrap text-sm font-semibold leading-tight text-white">
                {t('brandName')}
              </span>

              <span className="block whitespace-nowrap text-xs leading-tight text-white/70">
                {t('brandLocation')}
              </span>

              <span className="mt-0.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#8AFF8A]">
                {t('brandTagline')}
              </span>
            </div>
          </Link>

          {/* Navegación central */}
          <div className="min-w-0 flex-1">
            <MegaMenu navigation={navigation} />
          </div>

          {/* Acciones para escritorio amplio */}
          <div className="hidden shrink-0 items-center gap-2 2xl:flex">
            <Link
              href="/buscar"
              aria-label={t('searchAriaLabel')}
              title={t('searchTitle')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#5CFF5C] hover:bg-[#00A300] hover:text-[#001A00] hover:shadow-[0_12px_28px_-14px_rgba(0,209,0,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
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
            </Link>

            <LocaleSwitcher />

            <a
              href="https://aula.unc.edu.py"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('aulaVirtualAriaLabel')}
              className="pill-button pill-button-secondary px-5 py-2.5 text-xs"
            >
              {t('aulaVirtual')}
            </a>

            <a
              href="https://intranet.unc.edu.py"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('intranetAriaLabel')}
              className="pill-button pill-button-primary px-5 py-2.5 text-xs"
            >
              {t('intranet')}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}