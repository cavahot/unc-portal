export default function TransparenciaPage() {
  const documentos = [
    { titulo: "Presupuesto 2026", ley: "Ley 5189", fecha: "2026-01-15", tipo: "Presupuesto" },
    { titulo: "Nomina de funcionarios", ley: "Ley 5282", fecha: "2026-06-01", tipo: "Nomina" },
    { titulo: "Informe de gestion Q1", ley: "Ley 5282", fecha: "2026-04-30", tipo: "Informe" },
    { titulo: "Compras y contrataciones", ley: "Ley 5189", fecha: "2026-05-15", tipo: "Compras" },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Transparencia</h1>
      <p className="text-gray-600 mb-8">Documentos publicos segun Ley 5189/14 y Ley 5282/14</p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700">Documento</th>
              <th className="text-left p-4 font-semibold text-gray-700">Ley</th>
              <th className="text-left p-4 font-semibold text-gray-700">Tipo</th>
              <th className="text-left p-4 font-semibold text-gray-700">Fecha</th>
              <th className="text-left p-4 font-semibold text-gray-700">Accion</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <tr key={doc.titulo} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium text-blue-900">{doc.titulo}</td>
                <td className="p-4">{doc.ley}</td>
                <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{doc.tipo}</span></td>
                <td className="p-4 text-gray-500">{doc.fecha}</td>
                <td className="p-4">
                  <button className="text-orange-500 hover:text-orange-600 font-semibold text-sm">Descargar PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
