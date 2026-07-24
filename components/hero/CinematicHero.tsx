'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function CinematicHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(1, Math.max(0, scrolled / sectionHeight));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bgY = scrollProgress * 150;
  const contentOpacity = Math.max(0, 1 - scrollProgress * 1.5);
  const contentY = scrollProgress * -100;
  const scale = 1 + scrollProgress * 0.15;

  return (
    <section 
      ref={sectionRef}
      className="relative h-[300vh]"
      aria-label="Presentación institucional"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        
        {/* Background with parallax */}
        <div 
          className="absolute inset-0 z-0 will-change-transform"
          style={{
            transform: `translateY(${bgY}px) scale(${scale})`,
          }}
        >
          <Image
            src="/images/hero-campus.jpg"
            alt="Campus de la Universidad Nacional de Concepción al atardecer"
            fill
            priority
            className="object-cover"
            sizes="100vw"
            quality={85}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950/90" />
        </div>

        {/* Glass panel content */}
        <div 
          className="relative z-10 h-full flex items-center justify-center px-4 will-change-[opacity,transform]"
          style={{
            opacity: contentOpacity,
            transform: `translateY(${contentY}px)`,
          }}
        >
          <div className="glass-panel text-center px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
            <span className="inline-block text-amber-400 text-xs md:text-sm font-semibold tracking-[0.3em] uppercase mb-4">
              Universidad Nacional de Concepción
            </span>
            
            <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight mb-6">
              Formando el
              <br />
              <span className="text-amber-400">futuro</span> de
              <br />
              Paraguay
            </h1>
            
            <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Más de 50 años de excelencia académica, investigación 
              de impacto y compromiso con la transformación social.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="/carreras"
                className="pill-button pill-button-primary"
              >
                Explorar carreras
              </a>
              <a 
                href="/transparencia"
                className="pill-button pill-button-secondary"
              >
                Transparencia institucional
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          style={{ opacity: Math.max(0, contentOpacity) }}
        >
          <span className="text-white/50 text-xs tracking-[0.2em] uppercase">
            Desplazá para explorar
          </span>
          <div className="w-5 h-8 border border-white/30 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-scroll-dot" />
          </div>
        </div>
      </div>
    </section>
  );
}