export default function TramiteDetallePage({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = searchParams.slug || "solicitud-titulo";

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">Tramite: {slug.replace(/-/g, " ")}</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">Esta seccion esta en desarrollo. Los datos son de ejemplo.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="font-bold mb-2">Requisitos</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Cedula de identidad</li>
            <li>Certificado de estudios</li>
            <li>Comprobante de pago</li>
          </ul>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="font-bold mb-2">Duracion estimada</h2>
          <p className="text-gray-600">15 dias habiles</p>
        </div>
      </div>
    </div>
  );
}
