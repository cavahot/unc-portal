export default function FacultadDetallePage({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = searchParams.slug || "ingenieria";

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">Facultad de {slug.replace(/-/g, " ")}</h1>
      <p className="text-gray-600 mb-8">Informacion de la facultad en desarrollo.</p>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Carreras</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {["Carrera 1", "Carrera 2", "Carrera 3"].map((c) => (
          <div key={c} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="font-semibold text-blue-900">{c}</h3>
            <p className="text-sm text-gray-500 mt-1">5 anos | Presencial</p>
          </div>
        ))}
      </div>
    </div>
  );
}
