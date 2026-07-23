# Portal Institucional UNC

Universidad Nacional de Concepcion - Portal web moderno con Next.js.

## Estructura

- `/app` - Rutas y paginas del portal
- `/app/carreras` - Listado de carreras
- `/app/carreras/detalle` - Detalle de carrera (usa query param `?slug=`)
- `/app/facultades` - Listado de facultades
- `/app/facultades/detalle` - Detalle de facultad (usa query param `?slug=`)
- `/app/noticias` - Listado de noticias
- `/app/noticias/detalle` - Detalle de noticia (usa query param `?slug=`)
- `/app/transparencia` - Documentos publicos Ley 5189/5282
- `/app/tramites` - Listado de tramites
- `/app/tramites/detalle` - Detalle de tramite (usa query param `?slug=`)
- `/app/contacto` - Formulario de contacto

## Iniciar desarrollo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Subir a GitHub
2. Conectar con Vercel
3. Deploy automatico
