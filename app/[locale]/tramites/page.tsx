import Link from "next/link";

export default function TramitesPage() {
  const tramites = [
    { slug: "solicitud-titulo", nombre: "Solicitud de Titulo", duracion: "15 dias habiles" },
    { slug: "legalizacion-documentos", nombre: "Legalizacion de Documentos", duracion: "10 dias habiles" },
    { slug: "certificado-estudios", nombre: "Certificado de Estudios", duracion: "5 dias habiles" },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Tramites</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {tramites.map((t) => (
          <Link key={t.slug} href={`/tramites/detalle?slug=${t.slug}`} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
            <h3 className="font-bold text-blue-900 text-lg">{t.nombre}</h3>
            <p className="text-gray-500 text-sm mt-2">{t.duracion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
