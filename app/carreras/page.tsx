import Link from "next/link";

export default function CarrerasPage() {
  const carreras = [
    { slug: "ingenieria-civil", nombre: "Ingenieria Civil", duracion: "5 anos", facultad: "Facultad de Ingenieria" },
    { slug: "medicina", nombre: "Medicina", duracion: "6 anos", facultad: "Facultad de Ciencias Medicas" },
    { slug: "derecho", nombre: "Derecho", duracion: "5 anos", facultad: "Facultad de Derecho" },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Carreras</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {carreras.map((c) => (
          <Link key={c.slug} href={`/carreras/detalle?slug=${c.slug}`} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
            <h3 className="font-bold text-blue-900 text-lg">{c.nombre}</h3>
            <p className="text-orange-500 text-sm mb-2">{c.facultad}</p>
            <p className="text-gray-500 text-sm">{c.duracion} | Presencial</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
