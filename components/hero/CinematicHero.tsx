'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

function clamp(
  value: number,
  minimum = 0,
  maximum = 1,
) {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function smoothstep(
  start: number,
  end: number,
  value: number,
) {
  const normalized = clamp(
    (value - start) / (end - start),
  );

  return (
    normalized *
    normalized *
    (3 - 2 * normalized)
  );
}

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

function ScrollIcon() {
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
        strokeWidth={1.8}
        d="M12 5v14m0 0-5-5m5 5 5-5"
      />
    </svg>
  );
}

export default function CinematicHero() {
  const sectionRef =
    useRef<HTMLElement>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const lastProgressRef =
    useRef(-1);

  const [scrollProgress, setScrollProgress] =
    useState(0);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  const [compactViewport, setCompactViewport] =
    useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    const compactQuery = window.matchMedia(
      '(max-width: 767px)',
    );

    const updatePreferences = () => {
      setReducedMotion(motionQuery.matches);
      setCompactViewport(compactQuery.matches);
    };

    updatePreferences();

    motionQuery.addEventListener(
      'change',
      updatePreferences,
    );

    compactQuery.addEventListener(
      'change',
      updatePreferences,
    );

    return () => {
      motionQuery.removeEventListener(
        'change',
        updatePreferences,
      );

      compactQuery.removeEventListener(
        'change',
        updatePreferences,
      );
    };
  }, []);

  const updateScrollProgress =
    useCallback(() => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      if (reducedMotion) {
        if (lastProgressRef.current !== 0) {
          lastProgressRef.current = 0;
          setScrollProgress(0);
        }

        return;
      }

      const rect =
        section.getBoundingClientRect();

      const availableScroll =
        section.offsetHeight -
        window.innerHeight;

      if (availableScroll <= 0) {
        return;
      }

      const progress = clamp(
        Math.max(0, -rect.top) /
          availableScroll,
      );

      if (
        Math.abs(
          progress -
            lastProgressRef.current,
        ) < 0.001
      ) {
        return;
      }

      lastProgressRef.current =
        progress;

      setScrollProgress(progress);
    }, [reducedMotion]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (
        animationFrameRef.current !== null
      ) {
        return;
      }

      animationFrameRef.current =
        window.requestAnimationFrame(() => {
          updateScrollProgress();

          animationFrameRef.current =
            null;
        });
    };

    updateScrollProgress();

    window.addEventListener(
      'scroll',
      handleViewportChange,
      {
        passive: true,
      },
    );

    window.addEventListener(
      'resize',
      handleViewportChange,
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleViewportChange,
      );

      window.removeEventListener(
        'resize',
        handleViewportChange,
      );

      if (
        animationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        );
      }
    };
  }, [updateScrollProgress]);

  const progress = reducedMotion
    ? 0
    : scrollProgress;

  const cameraProgress =
    smoothstep(
      0.02,
      0.98,
      progress,
    );

  const cameraScale =
    1.035 +
    cameraProgress *
      (
        compactViewport
          ? 0.92
          : 1.38
      );

  const cameraTranslateX =
    cameraProgress *
    (
      compactViewport
        ? -0.8
        : -1.8
    );

  const cameraTranslateY =
    cameraProgress *
    (
      compactViewport
        ? -4.2
        : -6.8
    );

  const cameraBlur =
    smoothstep(
      0.72,
      0.98,
      progress,
    ) *
    (
      compactViewport
        ? 0.8
        : 1.6
    );

  const cameraBrightness =
    0.9 +
    smoothstep(
      0.15,
      0.68,
      progress,
    ) *
      0.07 -
    smoothstep(
      0.82,
      1,
      progress,
    ) *
      0.08;

  const cameraSaturation =
    1.04 +
    smoothstep(
      0.08,
      0.7,
      progress,
    ) *
      0.08;

  const contentFade =
    smoothstep(
      0.08,
      0.5,
      progress,
    );

  const contentOpacity =
    1 - contentFade;

  const contentTranslateY =
    smoothstep(
      0,
      0.55,
      progress,
    ) * -64;

  const contentTranslateX =
    smoothstep(
      0.08,
      0.5,
      progress,
    ) * -24;

  const contentScale =
    1 -
    smoothstep(
      0,
      0.52,
      progress,
    ) *
      0.045;

  const leftShadeOpacity =
    0.82 -
    smoothstep(
      0.28,
      0.76,
      progress,
    ) *
      0.48;

  const generalShadeOpacity =
    0.22 -
    smoothstep(
      0.12,
      0.72,
      progress,
    ) *
      0.1;

  const gateGlowOpacity =
    smoothstep(
      0.22,
      0.65,
      progress,
    ) *
    (
      1 -
      smoothstep(
        0.77,
        0.96,
        progress,
      )
    );

  const depthEffectOpacity =
    smoothstep(
      0.34,
      0.66,
      progress,
    ) *
    (
      1 -
      smoothstep(
        0.78,
        0.96,
        progress,
      )
    );

  const interfaceOpacity =
    1 -
    smoothstep(
      0.02,
      0.28,
      progress,
    );

  const greenTransitionOpacity =
    smoothstep(
      0.76,
      0.95,
      progress,
    );

  const lightTransitionOpacity =
    smoothstep(
      0.91,
      1,
      progress,
    );

  const bottomBlendOpacity =
    0.24 +
    smoothstep(
      0.68,
      1,
      progress,
    ) *
      0.76;

  const sectionClassName =
    reducedMotion
      ? 'relative min-h-[720px]'
      : 'relative h-[285svh] sm:h-[310svh] lg:h-[335svh]';

  const viewportClassName =
    reducedMotion
      ? 'relative h-svh min-h-[720px]'
      : 'sticky top-0 h-svh min-h-[640px]';

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className={sectionClassName}
    >
      <div
        className={`
          ${viewportClassName}
          isolate overflow-hidden
          bg-[#001A00]
        `}
      >
        <div
          className="absolute inset-0 z-0 will-change-transform"
          style={{
            transform: reducedMotion
              ? 'none'
              : `
                translate3d(
                  ${cameraTranslateX}%,
                  ${cameraTranslateY}%,
                  0
                )
                scale(${cameraScale})
              `,

            transformOrigin:
              compactViewport
                ? '56% 64%'
                : '54% 62%',

            filter: `
              brightness(${cameraBrightness})
              saturate(${cameraSaturation})
              contrast(1.04)
              blur(${cameraBlur}px)
            `,
          }}
        >
          <Image
            src="/images/campus-3d/hero-entry.webp"
            alt="Acceso principal de la Universidad Nacional de Concepción"
            fill
            priority
            quality={92}
            sizes="100vw"
            className="select-none object-cover object-[54%_54%]"
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-[#001A00]"
          style={{
            opacity:
              generalShadeOpacity,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(0,26,0,0.96)_0%,rgba(0,26,0,0.82)_24%,rgba(0,26,0,0.36)_54%,rgba(0,26,0,0.06)_76%,transparent_100%)]"
          style={{
            opacity:
              leftShadeOpacity,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,26,0,0.34)_0%,transparent_30%,transparent_61%,rgba(0,26,0,0.65)_100%)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[4] shadow-[inset_0_0_180px_rgba(0,26,0,0.62)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_54%_61%,rgba(184,255,184,0.24)_0%,rgba(92,255,92,0.09)_20%,transparent_49%)]"
          style={{
            opacity:
              gateGlowOpacity,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[6] bg-[radial-gradient(ellipse_at_54%_62%,transparent_0%,transparent_18%,rgba(0,26,0,0.03)_42%,rgba(0,26,0,0.28)_100%)]"
          style={{
            opacity:
              depthEffectOpacity,
          }}
        />

        <div className="absolute inset-0 z-10 flex items-center">
          <div className="mx-auto w-full max-w-[1380px] px-5 pb-14 pt-28 sm:px-8 lg:px-12 xl:px-16">
            <div
              className="max-w-[790px] will-change-transform"
              style={{
                opacity:
                  contentOpacity,

                pointerEvents:
                  contentOpacity > 0.18
                    ? 'auto'
                    : 'none',

                transform: reducedMotion
                  ? 'none'
                  : `
                    translate3d(
                      ${contentTranslateX}px,
                      ${contentTranslateY}px,
                      0
                    )
                    scale(${contentScale})
                  `,
              }}
            >
              <div className="inline-flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-9 bg-[#5CFF5C] shadow-[0_0_14px_rgba(92,255,92,0.9)]"
                />

                <span className="text-[0.67rem] font-extrabold uppercase tracking-[0.31em] text-[#B8FFB8] sm:text-xs">
                  Marcando el Norte
                </span>
              </div>

              <h1
                id="hero-title"
                className="mt-6 max-w-[780px] font-serif text-[3.15rem] font-bold leading-[0.9] tracking-[-0.055em] text-white [text-shadow:0_7px_34px_rgba(0,26,0,0.82)] sm:text-[4.4rem] lg:text-[5.5rem] xl:text-[6.25rem]"
              >
                <span className="block">
                  Bienvenidos a la
                </span>

                <span className="block">
                  Universidad Nacional
                </span>

                <span className="block">
                  de Concepción
                </span>
              </h1>

              <p className="mt-7 max-w-[650px] text-sm font-medium leading-7 text-white/[0.86] [text-shadow:0_3px_14px_rgba(0,26,0,0.9)] sm:text-base lg:text-lg">
                Una universidad pública que integra identidad,
                excelencia académica, investigación, innovación
                y compromiso con el desarrollo sostenible del
                norte del Paraguay.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/carreras"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#00D100] px-6 py-3 text-sm font-extrabold text-[#001A00] shadow-[0_15px_38px_rgba(0,209,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#5CFF5C] hover:shadow-[0_20px_48px_rgba(92,255,92,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FFB8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
                >
                  Explorar carreras

                  <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>

                <Link
                  href="/institucional"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/45 bg-white/[0.11] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,26,0,0.2)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/75 hover:bg-white/[0.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#004700]"
                >
                  Conocer la UNC

                  <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/25 pt-5 text-[0.65rem] font-bold uppercase tracking-[0.17em] text-white/75 sm:text-xs">
                <span>
                  Universidad pública
                </span>

                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[#5CFF5C]"
                />

                <span>
                  Fundada en 2007
                </span>

                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[#5CFF5C]"
                />

                <span>
                  Concepción · Paraguay
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute left-5 top-28 z-20 hidden items-center gap-3 rounded-full border border-white/25 bg-[#001A00]/40 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.17em] text-white/80 shadow-lg backdrop-blur-md lg:flex"
          style={{
            opacity:
              interfaceOpacity,
          }}
        >
          <span className="h-2 w-2 rounded-full bg-[#5CFF5C] shadow-[0_0_16px_rgba(92,255,92,0.9)]" />

          Acceso principal
        </div>

        <div
          aria-hidden="true"
          className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 text-white lg:flex"
          style={{
            opacity:
              interfaceOpacity,
          }}
        >
          <span className="[writing-mode:vertical-rl] rotate-180 text-[0.57rem] font-bold uppercase tracking-[0.26em] text-white/70">
            Desplázate para ingresar
          </span>

          <div className="relative h-24 w-px overflow-hidden bg-white/25">
            <span
              className="absolute inset-x-0 top-0 block h-full origin-top bg-[#5CFF5C] shadow-[0_0_12px_rgba(92,255,92,0.85)]"
              style={{
                transform: `
                  scaleY(
                    ${Math.max(
                      0.06,
                      progress,
                    )}
                  )
                `,
              }}
            />
          </div>

          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/[0.1] backdrop-blur-sm">
            <ScrollIcon />
          </span>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 lg:hidden"
          style={{
            opacity:
              interfaceOpacity,
          }}
        >
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.21em] text-white/75">
            Desplázate para ingresar
          </span>

          <span className="flex h-8 w-8 animate-bounce items-center justify-center rounded-full border border-white/30 bg-white/[0.1] text-white backdrop-blur-sm">
            <ScrollIcon />
          </span>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-44 bg-gradient-to-b from-transparent via-[#F4F7F5]/25 to-[#F4F7F5]"
          style={{
            opacity:
              bottomBlendOpacity,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-[#004700]"
          style={{
            opacity:
              greenTransitionOpacity,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 bg-[#F4F7F5]"
          style={{
            opacity:
              lightTransitionOpacity,
          }}
        />
      </div>
    </section>
  );
}
