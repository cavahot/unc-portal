/**
 * Datos de siembra de /contacto/dependencias (INST-12). Convertidos de forma programática desde el arreglo que estaba escrito
 * en `app/[locale]/contacto/dependencias/page.tsx` (Rectorado y seis facultades: 10 sedes). Desde INST-12 el CMS es la fuente y este
 * archivo solo siembra el estado inicial. AVISO: no tienen una fuente verificable en el repositorio; cada unidad debe confirmar
 * sus teléfonos y correos (se corrigen desde el panel). Spec: docs/specs/portal/DEPENDENCIAS.md §2.4.
 */
export const DEPENDENCIAS_SEED = [
  {
    "slug": "rectorado",
    "nombre": "Rectorado",
    "logo": "/images/campus-3d/logo-unc.png",
    "destacada": true,
    "orden": 1,
    "sedes": [
      {
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 241069",
          "(595 331) 240883"
        ],
        "correos": [
          "uncrectorado@gmail.com",
          "secgral@unc.edu.py"
        ]
      }
    ]
  },
  {
    "slug": "odontologia",
    "nombre": "Facultad de Odontología",
    "logo": "/images/facultades/odontologia.png",
    "destacada": false,
    "orden": 2,
    "sedes": [
      {
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 241680"
        ],
        "correos": [
          "decanatofo@unc.edu.py",
          "secretariagralfo@unc.edu.py"
        ],
        "web": "http://www.founc.edu.py"
      }
    ]
  },
  {
    "slug": "agrarias",
    "nombre": "Facultad de Ciencias Agrarias",
    "logo": "/images/facultades/agrarias.png",
    "destacada": false,
    "orden": 3,
    "sedes": [
      {
        "nombre": "Sede Concepción — Campus Universitario",
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 241813"
        ],
        "correos": [
          "secgralfcaunc@gmail.com",
          "fca-unc@fca-unc.edu.py"
        ],
        "web": "http://www.fca-unc.edu.py"
      },
      {
        "nombre": "Filial Horqueta",
        "direccion": "Av. Capitán Gumercindo Sosa c/ Ruta V \"Gral. Bernardino Caballero\", Horqueta",
        "telefonos": [
          "(595 332) 222133"
        ],
        "correos": []
      }
    ]
  },
  {
    "slug": "economicas",
    "nombre": "Facultad de Ciencias Económicas y Administrativas",
    "logo": "/images/facultades/economicas.png",
    "destacada": false,
    "orden": 4,
    "sedes": [
      {
        "nombre": "Sede Concepción — Campus Universitario",
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 241749"
        ],
        "correos": [
          "secretariageneral@fcea-unc.edu.py"
        ],
        "web": "http://www.fcea-unc.edu.py"
      },
      {
        "nombre": "Filial Horqueta",
        "direccion": "Av. Capitán Gumercindo Sosa c/ Ruta V \"Gral. Bernardino Caballero\", Horqueta",
        "telefonos": [
          "(595 332) 222133"
        ],
        "correos": []
      }
    ]
  },
  {
    "slug": "medicina",
    "nombre": "Facultad de Medicina",
    "logo": "/images/facultades/medicina.png",
    "destacada": false,
    "orden": 5,
    "sedes": [
      {
        "nombre": "Campus Universitario",
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 242591",
          "(595 331) 241022"
        ],
        "correos": [
          "fm-secretariageneral@unc.edu.py",
          "facultadunc@hotmail.com"
        ],
        "web": "http://www.fmedicina-unc.edu.py"
      },
      {
        "nombre": "Predio Hospital Regional",
        "direccion": "Prof. Guillermo Cabral y Dr. Marcial Royg Bernal, Concepción",
        "telefonos": [],
        "correos": []
      }
    ]
  },
  {
    "slug": "humanidades",
    "nombre": "Facultad de Humanidades y Ciencias de la Educación",
    "logo": "/images/facultades/humanidades.png",
    "destacada": false,
    "orden": 6,
    "sedes": [
      {
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 243176"
        ],
        "correos": [
          "secgral@fhyce.edu.py",
          "administracion@fhyce.edu.py"
        ],
        "web": "http://www.fhyce.edu.py"
      }
    ]
  },
  {
    "slug": "exactas",
    "nombre": "Facultad de Ciencias Exactas y Tecnológicas",
    "logo": "/images/facultades/exactas.png",
    "destacada": false,
    "orden": 7,
    "sedes": [
      {
        "direccion": "Ruta V Gral. Bernardino Caballero Km 2, Concepción",
        "telefonos": [
          "(595 331) 243361"
        ],
        "correos": [
          "academicofacet@unc.edu.py",
          "decanatofacet@unc.edu.py"
        ],
        "web": "http://www.facet-unc.edu.py"
      }
    ]
  }
]
