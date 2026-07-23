import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Formando profesionales para el desarrollo del pais
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Universidad Nacional de Concepcion - Excelencia academica, investigacion e innovacion
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/carreras" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition">
              Explorar Carreras
            </Link>
            <Link href="/transparencia" className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition backdrop-blur">
              Transparencia
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Accesos rapidos</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { title: "Carreras", desc: "Todas las carreras por facultad", href: "/carreras" },
              { title: "Calendario Academico", desc: "Fechas importantes del ano", href: "#" },
              { title: "Titulos y Legalizaciones", desc: "Tramites de graduacion", href: "/tramites" },
              { title: "Aula Virtual", desc: "Plataforma de aprendizaje", href: "#" },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition border border-gray-100">
                <h4 className="font-bold text-blue-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Ultimas noticias</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Inicio de clases 2026", date: "15 de julio, 2026", cat: "Institucional" },
              { title: "Nueva carrera de Inteligencia Artificial", date: "10 de julio, 2026", cat: "Academica" },
              { title: "Convenio internacional de investigacion", date: "5 de julio, 2026", cat: "Investigacion" },
            ].map((news) => (
              <article key={news.title} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-400">
                  <span>Imagen</span>
                </div>
                <div className="p-4">
                  <span className="text-xs font-semibold text-orange-500 uppercase">{news.cat}</span>
                  <h4 className="font-bold text-gray-800 mt-1 mb-2">{news.title}</h4>
                  <p className="text-sm text-gray-500">{news.date}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-blue-50">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Transparencia Activa</h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link href="/transparencia" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition text-center">
              <h4 className="font-bold text-blue-900 text-lg mb-2">Ley 5189/14</h4>
              <p className="text-gray-600 text-sm">Acceso a la informacion publica</p>
            </Link>
            <Link href="/transparencia" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition text-center">
              <h4 className="font-bold text-blue-900 text-lg mb-2">Ley 5282/14</h4>
              <p className="text-gray-600 text-sm">Rendicion de cuentas</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
