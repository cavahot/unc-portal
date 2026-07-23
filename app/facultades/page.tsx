import Link from "next/link";

export default function FacultadesPage() {
  const facultades = [
    { slug: "ingenieria", nombre: "Facultad de Ingenieria" },
    { slug: "ciencias-medicas", nombre: "Facultad de Ciencias Medicas" },
    { slug: "derecho", nombre: "Facultad de Derecho" },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Facultades</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {facultades.map((f) => (
          <Link key={f.slug} href={`/facultades/detalle?slug=${f.slug}`} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
            <h3 className="font-bold text-blue-900 text-lg">{f.nombre}</h3>
            <p className="text-gray-500 text-sm mt-2">Ver carreras</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
