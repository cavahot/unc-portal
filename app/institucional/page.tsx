export default function InstitucionalPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Institucional</h1>
      <p className="text-gray-700 mb-4">
        La Universidad Nacional de Concepcion es una institucion de educacion superior 
        publica del Paraguay, comprometida con la formacion de profesionales de excelencia.
      </p>
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Mision</h2>
          <p className="text-gray-600">Formar profesionales integros con compromiso social y excelencia academica.</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Vision</h2>
          <p className="text-gray-600">Ser referente de educacion superior en la region, con impacto en el desarrollo nacional.</p>
        </div>
      </div>
    </div>
  );
}
