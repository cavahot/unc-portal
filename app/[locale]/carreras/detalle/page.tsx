export default function CarreraDetallePage({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = searchParams.slug || "ingenieria-civil";

  const carreras: Record<string, { nombre: string; duracion: string; facultad: string }> = {
    "ingenieria-civil": { nombre: "Ingenieria Civil", duracion: "5 anos", facultad: "Facultad de Ingenieria" },
    "medicina": { nombre: "Medicina", duracion: "6 anos", facultad: "Facultad de Ciencias Medicas" },
    "derecho": { nombre: "Derecho", duracion: "5 anos", facultad: "Facultad de Derecho" },
  };

  const carrera = carreras[slug] || { nombre: slug, duracion: "Consultar", facultad: "Consultar" };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">{carrera.nombre}</h1>
      <p className="text-orange-500 font-semibold mb-6">{carrera.facultad}</p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Duracion</h3>
          <p>{carrera.duracion}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Modalidad</h3>
          <p>Presencial</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Titulo otorgado</h3>
          <p>{carrera.nombre}</p>
        </div>
      </div>
    </div>
  );
}
