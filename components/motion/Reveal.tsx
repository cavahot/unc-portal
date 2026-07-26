'use client';

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function Reveal({
  children,
  className = '',
  delay = 0,
}: RevealProps) {
  const elementRef =
    useRef<HTMLDivElement>(null);

  const [visible, setVisible] =
    useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const reducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

    if (
      reducedMotion ||
      !('IntersectionObserver' in window)
    ) {
      setVisible(true);
      return;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            return;
          }

          setVisible(true);
          observer.unobserve(element);
        },
        {
          threshold: 0.08,
          rootMargin:
            '0px 0px -5% 0px',
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`
        transition-[opacity,transform]
        duration-700
        ease-[cubic-bezier(0.2,0.7,0.2,1)]
        ${
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-8 opacity-0'
        }
        ${className}
      `}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}