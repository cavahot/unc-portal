import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universidad Nacional de Concepcion",
  description: "Portal institucional de la Universidad Nacional de Concepcion - Paraguay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        <header className="bg-blue-900 text-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-lg">
                UNC
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Universidad Nacional de Concepcion</h1>
                <p className="text-xs text-blue-200">Portal Institucional</p>
              </div>
            </div>
            <nav className="hidden md:flex gap-6 text-sm">
              <a href="/" className="hover:text-orange-300 transition">Inicio</a>
              <a href="/institucional" className="hover:text-orange-300 transition">Institucional</a>
              <a href="/carreras" className="hover:text-orange-300 transition">Carreras</a>
              <a href="/transparencia" className="hover:text-orange-300 transition">Transparencia</a>
              <a href="/contacto" className="hover:text-orange-300 transition">Contacto</a>
            </nav>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

        <footer className="bg-gray-900 text-gray-400 text-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-white font-bold mb-2">Universidad Nacional de Concepcion</h3>
                <p>Concepcion, Paraguay</p>
                <p>www.unc.edu.py</p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Enlaces rapidos</h3>
                <ul className="space-y-1">
                  <li><a href="/transparencia" className="hover:text-white">Transparencia</a></li>
                  <li><a href="/tramites" className="hover:text-white">Tramites</a></li>
                  <li><a href="/contacto" className="hover:text-white">Contacto</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Accesibilidad</h3>
                <p>Este sitio cumple con WCAG 2.2 AA</p>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-6 pt-4 text-center text-xs">
              &copy; 2026 Universidad Nacional de Concepcion. Todos los derechos reservados.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
