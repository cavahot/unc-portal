'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import MegaMenu from '@/components/navigation/MegaMenu';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/5 bg-slate-950/90 shadow-lg backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      {/* Enlace de salto para accesibilidad */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950"
      >
        Saltar al contenido principal
      </a>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Identidad institucional */}
          <a
            href="/"
            aria-label="Ir al inicio de la Universidad Nacional de Concepción"
            className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <div className="flex h-12 w-12 items-center justify-center lg:h-14 lg:w-14">
              <Image
                src="/logo.png"
                alt="Logotipo oficial de la Universidad Nacional de Concepción"
                width={112}
                height={112}
                priority
                sizes="(min-width: 1024px) 56px, 48px"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="hidden sm:block">
              <span className="block text-sm font-semibold leading-tight text-white">
                Universidad Nacional
              </span>

              <span className="block text-xs leading-tight text-white/70">
                de Concepción
              </span>
            </div>
          </a>

          {/* Navegación principal y menú móvil */}
          <MegaMenu />

          {/* Acciones del sector derecho */}
          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="/buscar"
              className="rounded-full p-2.5 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Buscar en el portal institucional"
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
            </a>

            <a
              href="https://aula.unc.edu.py"
              target="_blank"
              rel="noopener noreferrer"
              className="pill-button pill-button-secondary px-4 py-2 text-xs"
            >
              Aula Virtual
            </a>

            <a
              href="https://intranet.unc.edu.py"
              target="_blank"
              rel="noopener noreferrer"
              className="pill-button pill-button-primary px-4 py-2 text-xs"
            >
              Intranet
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}