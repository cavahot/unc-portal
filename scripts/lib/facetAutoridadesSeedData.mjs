// AUT-FACET: snapshot verificable de autoridades publicado por FACET-UNC.
// Qué hace: conserva el HTML incrustado, los nombres/cargos visibles y las URL de las fotos oficiales.
// Amenaza: evita inventar cargos y permite repetir el seed sin depender de datos hardcodeados en la página.
// Límite: la fuente no publica fotos para todos los directivos; esos registros quedan sin foto hasta que exista una imagen oficial.
export const SOURCES = {
  page: 'https://facet-unc.edu.py/autoridades-y-directivos/',
  embedded: 'https://facet-unc.edu.py/extras_facet/autoridades/index.html',
}

export const FACULTAD_SLUG = 'facultad-de-ciencias-exactas-y-tecnologicas'

const photo = (url, alt) => ({ url, alt })
const person = (name, role, type, order, options = {}) => ({
  name,
  role,
  type,
  order,
  faculty: options.faculty ?? true,
  photo: options.photo ?? null,
})

export const AUTHORITIES = [
  person('Prof. Dr. Clarito Rojas Marín', 'Rector UNC', 'rector', 1, { faculty: false, photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/rojas_marin.jpg', 'Prof. Dr. Clarito Rojas Marín, Rector de la UNC') }),
  person('Prof. Dr. Arnaldo Miguel Ferreira Cabañas', 'Vicerrector UNC', 'vicerrector', 2, { faculty: false, photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/arnaldo_ferreira.jpg', 'Prof. Dr. Arnaldo Miguel Ferreira Cabañas, Vicerrector de la UNC') }),
  person('Prof. Mg. Jorge Elías Sanz Cabrera', 'Decano FACET', 'decano', 3, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/jorge_elias.jpg', 'Prof. Mg. Jorge Elías Sanz Cabrera, Decano de FACET') }),
  person('Prof. Dr. Jorge Daniel Mello Román', 'Vicedecano FACET', 'director', 4, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2024/06/decano.jpg', 'Prof. Dr. Jorge Daniel Mello Román, Vicedecano de FACET') }),

  person('Prof. Dr. Pedro Alberto Villalba Sosa', 'Rep. Tit. Docente — Consejo Directivo', 'director', 10, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Pedro_Villalba.jpg', 'Prof. Dr. Pedro Alberto Villalba Sosa') }),
  person('Prof. Ing. Gustavo Aníbal Alarcón Arredondo', 'Rep. Tit. Docente — Consejo Directivo; Coord. de Carrera Ing. Civil', 'director', 11, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Gustavo_Alarcon2.jpg', 'Prof. Ing. Gustavo Aníbal Alarcón Arredondo') }),
  person('Prof. Mg. Alfredo Talavera Garcete', 'Rep. Tit. Docente — Consejo Directivo; Aseguramiento de la Calidad', 'director', 12, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Alfredo_Talavera.jpg', 'Prof. Mg. Alfredo Talavera Garcete') }),
  person('Prof. Mg. Nelson Andrés Valdez Velázquez', 'Rep. Tit. Docente — Consejo Directivo', 'director', 13, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Nelson_Valdez.jpg', 'Prof. Mg. Nelson Andrés Valdez Velázquez') }),
  person('Prof. Ing. Fátima Alexandra Abente Galeano', 'Rep. Tit. Docente — Consejo Directivo', 'director', 14, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2024/06/no_perfil_2024.jpg', 'Fotografía de perfil no disponible para Prof. Ing. Fátima Alexandra Abente Galeano') }),
  person('Ing. Joel David Ruiz González', 'Rep. Tit. No Docente — Consejo Directivo', 'director', 15, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Joel_Ruiz.jpg', 'Ing. Joel David Ruiz González') }),
  person('Univ. Naomi Ramos Echagüe', 'Rep. Estudiante — Consejo Directivo', 'director', 16, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Naomi_Ramos.jpg', 'Univ. Naomi Ramos Echagüe') }),
  person('Univ. Carmen Lavand', 'Rep. Estudiante — Consejo Directivo', 'director', 17, { photo: photo('https://facet-unc.edu.py/wp-content/uploads/2026/03/Carmen.jpg', 'Univ. Carmen Lavand') }),
  person('Prof. Mg. María Teresa Martínez de Wood', 'Rep. Tit. Docente — Consejo Superior Universitario', 'director', 18, { faculty: false }),

  person('Mg. Sintia Liza Oporto Ortiz', 'Secretaría General', 'secretario', 30),
  person('Mg. Richard Ramón Solis Argüello', 'Dirección Gabinete', 'director', 31),
  person('Mg. Liz Paola Alarcón López', 'Dirección Académica', 'director', 32),
  person('Mg. Sandino Manuel Valiente Abente', 'Dirección Administrativa', 'director', 33),
  person('Dr. Nery Adolfo Sanabria Denis', 'Dirección de Talento Humano', 'director', 34),
  person('Lic. Luz Marina Pereira', 'Bienestar Institucional', 'director', 35),
  person('Mg. Graciela Ramírez Torales', 'Posgrado', 'director', 36),
  person('Mg. Ricardo Daniel Escobar Torres', 'Investigación', 'director', 37),
  person('Mg. Jorge Dario Aquino', 'Control Interno', 'director', 38),
  person('Mg. Iván Diosnel Rojas Chávez', 'MECIP', 'director', 39),
  person('Mg. Flor de María Váldez Cristaldo', 'Curso de Admisión', 'director', 40),
  person('Mg. Ariana Josefina Cañete Villalba', 'Orientación Académica', 'director', 41),
  person('Mg. Cristhian René Ramírez Aponte', 'TFG', 'director', 42),
  person('Mg. María Teresa Huerta Chamorro', 'Extensión y Pasantía LMA', 'director', 43),
  person('Ing. Alice Judith Velázquez Arce', 'Extensión y Pasantía Ing. Ind.', 'director', 44),
  person('Sandra Mabel Fariña Aquino', 'Extensión y Pasantía Ing. Civil', 'director', 45),
]

const seedData = { SOURCES, FACULTAD_SLUG, AUTHORITIES }
export default seedData
