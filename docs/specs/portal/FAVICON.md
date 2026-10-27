# FAV-01 — Conjunto de íconos del portal

## SDD
- Dado el portal, cuando un navegador carga cualquier página, entonces el `<head>` declara `rel=icon` (ico, 192, 512), `apple-touch-icon` y `manifest`.
- Cada URL responde 200 con `image/*` (o manifest JSON), no `text/html`.
- El ícono es el logo oficial sobre disco blanco (legible en pestañas oscuras). Maskable: disco al 70% sobre verde `#004700`.
- Fuera de alcance: versión simplificada para 16 px (decisión del PO si el logo completo no se lee).

## RDD (hechos observados)
- `public/favicon.ico` original: 1 imagen 16x16, alfa máximo 0 (totalmente transparente).
- `app/layout.tsx` no declaraba `icons`; el HTML no tenía `<link rel="icon">`.
- `proxy.ts:133` (matcher) excluye `favicon.ico`, `images/`, `icons/`... pero NO `icon-192.png` ni `site.webmanifest` en la raíz: `curl /icon-192.png` y `/site.webmanifest` devolvieron 200 `text/html` (404 localizado). Por eso los archivos van en `public/icons/`.
- CSP (`lib/csp.ts`): sin `manifest-src`, cae en `default-src 'self'`; `img-src 'self'` cubre los íconos. No se modifica.

## Regenerar
`node scripts/generate-favicons.mjs` (sharp). Rollback: `git checkout public/favicon.ico app/layout.tsx` y borrar `public/icons/`.
