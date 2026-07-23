export default function ContactoPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Contacto</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">Informacion de contacto</h2>
        <div className="space-y-2 text-gray-600">
          <p>Concepcion, Paraguay</p>
          <p>info@unc.edu.py</p>
          <p>+595 XXX XXXXXX</p>
        </div>
      </div>

      <form className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input type="text" id="nombre" name="nombre" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
          <input type="email" id="email" name="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
          <textarea id="mensaje" name="mensaje" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required></textarea>
        </div>
        <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition">
          Enviar mensaje
        </button>
      </form>
    </div>
  );
}
