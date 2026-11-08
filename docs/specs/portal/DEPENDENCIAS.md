# Contactos por dependencia (/contacto/dependencias) desde el CMS

**Tarea:** INST-12 — mover el directorio de contactos al CMS y rediseñar la página con el sistema visual del portal.
**Regla del proyecto:** todo contenido sale del CMS (DB → CMS → portal); sin datos escritos en el código.

## 1. Problema

`app/[locale]/contacto/dependencias/page.tsx` trae el directorio completo (Rectorado y seis facultades: direcciones, teléfonos, correos, sitios web, logos) escrito en el código, sin textos por idioma (español fijo y voseo «Encontrá»), sin estados de carga y con enlaces sin el prefijo del idioma. Un cambio de teléfono exige un despliegue.

## 2. Comportamiento

### 2.1 Colección `dependencias-contacto`
- Una fila por dependencia: `slug` (único, minúsculas y guiones; es el ancla `#dept-<slug>`), `nombre`, `logo` (ruta pública bajo `/images/`), `destacada` (cabecera verde, usada por Rectorado), `orden`, `activa`.
- `sedes` (1 a 10): `nombre` opcional, `direccion`, `telefonos` (texto libre), `correos` (formato de correo), `web` (http o https).
- Acceso: un anónimo solo lee las activas; crear, editar y borrar exigen `canWriteInstitutional`. Revalidación por la etiqueta `dependencias-contacto` (al guardar y al borrar).
- Solo español (como `/titulos`); la interfaz se traduce.

### 2.2 Migración `dependencias_01`
Solo crea objetos nuevos, idempotente; su `down` se niega a correr si hay filas.

### 2.3 Consulta `getDependencias()`
Estados `ok` (al menos una dependencia válida), `empty`, `unavailable` (CMS caído o forma inesperada); nunca lanza y no filtra el mensaje del error. El mapeador descarta lo inválido: dependencia sin nombre o sin sedes, sede sin dirección, logo fuera de `/images/`, correo mal formado, web que no sea http(s).

### 2.4 Siembra `scripts/seed-dependencias.mjs`
Dry-run por defecto, `--apply` con credenciales, solo CMS local salvo `--allow-remote` con https; idempotente por `slug`; nunca pisa ediciones.

### 2.5 Página
Cabecera `PageHero`, fondo claro, tarjetas por dependencia, chips de salto, enlaces `tel:`/`mailto:` y sitio web con `safeHref`, salida a Contacto con prefijo del idioma, estados vacío/no disponible en línea (`StatePanel`), `error.tsx` y `loading.tsx` claros, textos en 4 idiomas, español en «usted».

## 3. Aceptación
- Dado el CMS con las 7 dependencias sembradas, la página muestra las 7 con sus datos y anclas.
- Dado el CMS caído, muestra «no disponible» con reintentar y ningún dato escrito en el código.
- Dado un correo mal formado o una web `javascript:` en el CMS, esa línea no se muestra.
- Dada la migración, reaplicarla no falla y `down` con filas se rechaza.

## 4. Fuera de alcance
Traducir el contenido del directorio; logos desde la mediateca; el directorio de `/contacto`.

## 5. Aviso
Los datos se cargan tal como estaban en la página, sin revisión de la fuente: cada unidad debe confirmar sus teléfonos y correos (se corrigen desde el CMS).
