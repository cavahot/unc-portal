'use client';

import { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  href: string;
  description?: string;
  children?: MenuItem[];
}

const menuData: MenuItem[] = [
  {
    label: 'Institucional',
    href: '/institucional',
    children: [
      { label: 'Historia', href: '/institucional/historia', description: 'Origen y evolución de la UNC' },
      { label: 'Misión y Visión', href: '/institucional/mision-vision', description: 'Principios institucionales' },
      { label: 'Autoridades', href: '/autoridades', description: 'Rectorado y órganos de gobierno' },
      { label: 'Organigrama', href: '/institucional/organigrama', description: 'Estructura organizativa' },
    ],
  },
  {
    label: 'Estudiar en la UNC',
    href: '/estudiar',
    children: [
      { label: 'Carreras de Grado', href: '/carreras?nivel=grado', description: 'Oferta académica de pregrado' },
      { label: 'Posgrados', href: '/carreras?nivel=posgrado', description: 'Maestrías, especializaciones y doctorados' },
      { label: 'Admisión', href: '/estudiar/admision', description: 'Requisitos y proceso de inscripción' },
      { label: 'Becas', href: '/estudiar/becas', description: 'Ayudas estudiantiles disponibles' },
    ],
  },
  {
    label: 'Investigación',
    href: '/investigacion',
    children: [
      { label: 'Institutos', href: '/investigacion/institutos', description: 'Centros de investigación' },
      { label: 'Publicaciones', href: '/investigacion/publicaciones', description: 'Revistas científicas y papers' },
      { label: 'Proyectos', href: '/investigacion/proyectos', description: 'Investigaciones en curso' },
    ],
  },
  {
    label: 'Extensión',
    href: '/extension',
    children: [
      { label: 'Cursos', href: '/extension/cursos', description: 'Educación continua' },
      { label: 'Proyección Social', href: '/extension/proyeccion', description: 'Vinculación con la comunidad' },
    ],
  },
  {
    label: 'Transparencia',
    href: '/transparencia',
    children: [
      { label: 'Ley 5189', href: '/transparencia?ley=5189', description: 'Información pública obligatoria' },
      { label: 'Ley 5282', href: '/transparencia?ley=5282', description: 'Rendición de cuentas' },
      { label: 'Resoluciones', href: '/transparencia?tipo=resoluciones', description: 'Actos administrativos' },
      { label: 'Datos Abiertos', href: '/transparencia/datos-abiertos', description: 'Datasets institucionales' },
    ],
  },
  {
    label: 'Trámites',
    href: '/tramites',
    children: [
      { label: 'Títulos y Legalizaciones', href: '/tramites/titulos', description: 'Gestión de documentos académicos' },
      { label: 'Mesa de Entrada', href: '/tramites/mesa-entrada', description: 'Presentación de documentos' },
      { label: 'Solicitud de Información', href: '/tramites/solicitud-informacion', description: 'Acceso a información pública' },
    ],
  },
  {
    label: 'Noticias',
    href: '/noticias',
  },
];

export default function MegaMenu() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (index: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 200);
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <nav 
      ref={menuRef}
      className="w-full"
      aria-label="Navegación principal"
    >
      {/* Desktop menu */}
      <ul className="hidden lg:flex items-center gap-1">
        {menuData.map((item, index) => (
          <li 
            key={item.label}
            className="relative"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`px-4 py-2.5 text-sm font-medium rounded-full transition-all duration-200 ${
                activeIndex === index
                  ? 'text-amber-400 bg-white/10'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
              aria-expanded={activeIndex === index}
              aria-haspopup={item.children ? true : undefined}
              onFocus={() => handleFocus(index)}
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            >
              {item.label}
              {item.children && (
                <svg 
                  className={`inline-block ml-1 w-3.5 h-3.5 transition-transform duration-200 ${
                    activeIndex === index ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Mega menu dropdown */}
            {item.children && activeIndex === index && (
              <div 
                className="absolute top-full left-0 mt-2 w-[480px] glass-panel p-5 z-50"
                role="menu"
              >
                <div className="grid grid-cols-1 gap-1">
                  {item.children.map((child) => (
                    <a
                      key={child.href}
                      href={child.href}
                      className="group flex flex-col p-3 rounded-xl hover:bg-white/5 transition-colors"
                      role="menuitem"
                    >
                      <span className="text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                        {child.label}
                      </span>
                      {child.description && (
                        <span className="text-white/50 text-xs mt-0.5">
                          {child.description}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 text-white/80 hover:text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        aria-label="Abrir menú de navegación"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-slate-950/95 backdrop-blur-xl p-6 overflow-y-auto">
          <ul className="space-y-1">
            {menuData.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="block px-4 py-3 text-white font-medium rounded-xl hover:bg-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
                {item.children && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <a
                          href={child.href}
                          className="block px-4 py-2 text-white/60 text-sm rounded-xl hover:bg-white/5 hover:text-white"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}