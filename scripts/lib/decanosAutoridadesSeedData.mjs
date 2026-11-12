// AUT-DECANOS: catálogo de decanos publicado por la página oficial de la UNC.
// Qué hace: conserva únicamente los decanos y sus fotos oficiales para completar el CMS.
// Amenaza: evita alterar rectorado/vicerrectorado y evita usar fotografías de una fuente secundaria.
// Límite: actualiza solo autoridades de tipo `decano`; no toca otros cargos institucionales.
export const SOURCE = 'https://www.unc.edu.py/autoridades/'

const D = (facultySlug, name, role, order, image, alt) => ({
  facultySlug,
  name,
  role,
  type: 'decano',
  order,
  image: { url: image, alt },
})

export const DECANOS = [
  D('facultad-de-odontologia', 'Prof. Dr. Carlos Ramón Lima De León', 'Decano de la Facultad de Odontología', 10, 'https://unc.edu.py/wp-content/uploads/2025/10/7t-300x300-1.jpg', 'Prof. Dr. Carlos Ramón Lima De León, Decano de la Facultad de Odontología'),
  D('facultad-de-ciencias-agrarias', 'Prof. Ing. Agr. Derlys Fernando López Avalos', 'Decano de la Facultad de Ciencias Agrarias', 11, 'https://unc.edu.py/wp-content/uploads/2025/10/5t-300x300-1.jpg', 'Prof. Ing. Agr. Derlys Fernando López Avalos, Decano de la Facultad de Ciencias Agrarias'),
  D('facultad-de-ciencias-economicas-y-administrativas', 'Prof. Mg. Gerardo Lang Ferri', 'Decano de la Facultad de Ciencias Económicas y Administrativas', 12, 'https://unc.edu.py/wp-content/uploads/2025/10/6t-300x300-1.jpg', 'Prof. Mg. Gerardo Lang Ferri, Decano de la Facultad de Ciencias Económicas y Administrativas'),
  D('facultad-de-medicina', 'Prof. Dr. Roberto Gustavo Barrios', 'Decano de la Facultad de Medicina', 13, 'https://unc.edu.py/wp-content/uploads/2025/10/4t-300x300-1.jpg', 'Prof. Dr. Roberto Gustavo Barrios, Decano de la Facultad de Medicina'),
  D('facultad-de-humanidades-y-ciencias-de-la-educacion', 'Prof. Dra. María Concepción Araujo De Benítez', 'Decana de la Facultad de Humanidades y Ciencias de la Educación', 14, 'https://unc.edu.py/wp-content/uploads/2025/10/3t-300x300-1.jpg', 'Prof. Dra. María Concepción Araujo De Benítez, Decana de la Facultad de Humanidades y Ciencias de la Educación'),
]

const seedData = { SOURCE, DECANOS }
export default seedData
