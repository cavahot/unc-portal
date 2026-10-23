import type { RelationshipField } from 'payload'

import { canReadEditorialAuthorship } from '../access/roles'

/**
 * DEP-03: autoría del contenido editorial (`noticias` y `paginas`).
 *
 * Qué hace: relación NULLABLE a `users`, fijada por el servidor al crear (hook `beforeChange`) y de
 * solo lectura para los clientes (`access.create/update = false`: Payload elimina el valor enviado,
 * `beforeValidate/promise.js:217-228`). Habilita dos reglas de la matriz SEC-03: «nadie aprueba ni
 * publica lo propio» y «el corresponsal solo ve y edita lo suyo».
 *
 * Amenazas que evita: que el cliente elija o cambie el autor para esquivar «lo propio»; que el público
 * conozca los IDs de los autores (la lectura del campo es solo para personal editorial).
 *
 * Límites: es NULLABLE a propósito (las 271 noticias heredadas no tienen autor y no se infiere desde
 * el texto libre `author`); con autor nulo el corresponsal no ve ni edita y nadie queda bloqueado por
 * «lo propio». El relleno futuro es un script revisado, no ejecutado aquí. Columna `created_by_id`
 * con FK `ON DELETE set null`: si se borra al usuario, el contenido queda sin autor.
 */
export const createdByField: RelationshipField = {
  name: 'createdBy',
  label: 'Creado por',
  type: 'relationship',
  relationTo: 'users',
  required: false,
  hasMany: false,
  access: {
    create: () => false,
    update: () => false,
    read: canReadEditorialAuthorship,
  },
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: 'Lo fija el servidor al crear el contenido; no se puede cambiar.',
  },
}
