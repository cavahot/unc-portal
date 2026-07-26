'use client';

import {
  type ReactNode,
  useEffect,
  useRef,
} from 'react';

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  rotateX?: number;
  rotateY?: number;
  lift?: number;
  glare?: boolean;
};

export default function TiltCard({
  children,
  className = '',
  containerClassName = '',
  rotateX = 7,
  rotateY = 8,
  lift = 6,
  glare = true,
}: TiltCardProps) {
  const surfaceRef =
    useRef<HTMLDivElement>(null);

  const glareRef =
    useRef<HTMLDivElement>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const reducedMotionRef =
    useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    const updatePreference = () => {
      reducedMotionRef.current =
        mediaQuery.matches;
    };

    updatePreference();

    mediaQuery.addEventListener(
      'change',
      updatePreference,
    );

    return () => {
      mediaQuery.removeEventListener(
        'change',
        updatePreference,
      );

      if (
        animationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        );
      }
    };
  }, []);

  const updateCard = (
    pointerX: number,
    pointerY: number,
  ) => {
    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    const xRotation =
      -pointerY * rotateX;

    const yRotation =
      pointerX * rotateY;

    surface.style.transform = `
      perspective(1000px)
      translate3d(0, -${lift}px, 0)
      rotateX(${xRotation.toFixed(2)}deg)
      rotateY(${yRotation.toFixed(2)}deg)
    `;

    surface.style.transitionDuration =
      '90ms';

    if (glare && glareRef.current) {
      glareRef.current.style.opacity =
        '0.72';

      glareRef.current.style.background = `
        radial-gradient(
          circle at
          ${(pointerX + 0.5) * 100}%
          ${(pointerY + 0.5) * 100}%,
          rgba(255, 255, 255, 0.36),
          rgba(184, 255, 184, 0.14) 22%,
          transparent 55%
        )
      `;
    }
  };

  const resetCard = () => {
    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    surface.style.transform = `
      perspective(1000px)
      translate3d(0, 0, 0)
      rotateX(0deg)
      rotateY(0deg)
    `;

    surface.style.transitionDuration =
      '450ms';

    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      reducedMotionRef.current ||
      event.pointerType === 'touch'
    ) {
      return;
    }

    const target =
      event.currentTarget;

    const rect =
      target.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    const pointerX =
      (event.clientX - rect.left) /
        rect.width -
      0.5;

    const pointerY =
      (event.clientY - rect.top) /
        rect.height -
      0.5;

    if (
      animationFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        animationFrameRef.current,
      );
    }

    animationFrameRef.current =
      window.requestAnimationFrame(() => {
        updateCard(pointerX, pointerY);

        animationFrameRef.current = null;
      });
  };

  return (
    <div
      className={`relative h-full [perspective:1100px] ${containerClassName}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetCard}
      onPointerCancel={resetCard}
    >
      <div
        ref={surfaceRef}
        className={`
          relative h-full overflow-hidden
          transform-gpu
          [transform-style:preserve-3d]
          will-change-transform
          transition-[transform,border-color,box-shadow]
          ease-out
          ${className}
        `}
      >
        {children}

        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            className="
              pointer-events-none
              absolute inset-0 z-20
              opacity-0
              mix-blend-screen
              transition-opacity duration-300
            "
          />
        )}
      </div>
    </div>
  );
}