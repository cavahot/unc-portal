export default function Footer() {
  return (
    <footer className="relative z-10 bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <span className="text-slate-950 font-bold text-lg">UNC</span>
              </div>
              <div>
                <span className="text-white font-semibold text-sm block">Universidad Nacional</span>
                <span className="text-white/60 text-xs block">de Concepción</span>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Formando líderes, generando conocimiento, transformando el futuro de Paraguay desde 1967.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Institucional</h3>
            <ul className="space-y-2.5">
              {['Autoridades', 'Historia', 'Misión y Visión', 'Organigrama'].map((item) => (
                <li key={item}>
                  <a href={`/institucional/${item.toLowerCase().replace(/ /g, '-')}`} className="text-white/50 hover:text-amber-400 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Servicios</h3>
            <ul className="space-y-2.5">
              {['Carreras', 'Trámites', 'Transparencia', 'Contacto'].map((item) => (
                <li key={item}>
                  <a href={`/${item.toLowerCase().replace(/ /g, '-')}`} className="text-white/50 hover:text-amber-400 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Contacto</h3>
            <address className="not-italic text-white/50 text-sm space-y-2">
              <p>Concepción, Paraguay</p>
              <p>contacto@unc.edu.py</p>
              <p>+595 31 XXX XXX</p>
            </address>
            <div className="flex gap-3 mt-4">
              {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                <a
                  key={social}
                  href={`https://${social}.com/uncpy`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={`Seguir en ${social}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Universidad Nacional de Concepción. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <a href="/privacidad" className="text-white/30 hover:text-white/60 text-xs transition-colors">Política de privacidad</a>
            <a href="/accesibilidad" className="text-white/30 hover:text-white/60 text-xs transition-colors">Accesibilidad</a>
            <a href="/mapa-sitio" className="text-white/30 hover:text-white/60 text-xs transition-colors">Mapa del sitio</a>
          </div>
        </div>
      </div>
    </footer>
  );
}