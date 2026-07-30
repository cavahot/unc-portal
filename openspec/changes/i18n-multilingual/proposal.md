# Proposal: i18n-multilingual

**Change ID:** i18n-multilingual
**Date:** 2026-07-30
**Status:** draft

---

## 1. Intención

El portal es 100% español con `<html lang="es">` fijo y ~200-250 strings hardcodeados. La UNC recibe aspirantes y visitantes internacionales (Brasil, cooperación técnica en inglés) y tiene obligación institucional con el guaraní como lengua oficial del Paraguay. Hoy no hay ninguna infraestructura para servir otra lengua: cada texto vive incrustado en el JSX.

**Usuarios objetivo:** aspirantes y académicos brasileños (`pt-BR`), audiencia internacional y convenios (`en`), hablantes de guaraní (`gn`), y el público local actual (`es`) que no debe percibir ningún cambio.

---

## 2. Scope

### In scope (Fase 1)
- `next-intl` instalado y configurado con 4 locales: `es` (default), `en`, `pt-BR`, `gn`
- Migración de `app/` a `app/[locale]/` (incluye el catch-all `[...slug]`)
- `middleware.ts`: `createMiddleware` de next-intl fusionado con la lógica CORS + rate-limit existente
- Catálogos en `messages/{locale}/` por namespace (`common`, `nav`, `pages/*`)
- Extracción de strings de UI: Header, Footer, MegaMenu, AccessibilityPanel, CinematicHero, StatsBlock y las 8 páginas actuales
- Selector de idioma en el Header, con `<html lang>` dinámico
- Formato de fechas/números vía formatters de next-intl (reemplaza `'es-PY'` hardcodeado)

### Out of scope (no-goals)
- Localización en Payload CMS — noticias, transparencia, revistas y tesis quedan solo en español
- Traducción de contenido editorial o documentos PDF
- Detección automática por geolocalización o `Accept-Language` persistido en perfil
- SEO multilenguaje avanzado (`hreflang` completo, sitemaps por locale)
- Revisión lingüística profesional; el guaraní se apoya en diccionario en línea

---

## 3. Capabilities

### New Capabilities
- `i18n-routing`: locales soportados, prefijos de URL, middleware, fallback y `<html lang>`
- `i18n-messages`: estructura de catálogos, namespaces, claves y política de fallback a `es`

### Modified Capabilities
- Ninguna (no existe `openspec/specs/` consolidado en el repo)

---

## 4. Approach

`next-intl` con `localePrefix: 'as-needed'`: `es` conserva URLs limpias (`/noticias`), los demás locales reciben prefijo (`/en/noticias`). `NextIntlClientProvider` envuelve el árbol en el root layout; `useTranslations()` en componentes cliente y `getTranslations()` en servidor. Las rutas `/api/*` se excluyen del matcher para no romper CORS ni revalidación.

**Decisiones clave:** español sin prefijo (cero regresión de URLs y SEO existente); solo UI en Fase 1 (evita sobrecarga editorial); catálogos por namespace (evita bundles gigantes en cliente).

---

## 5. Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `app/**` | Modified | Todas las rutas bajan a `app/[locale]/` |
| `app/layout.tsx` | Modified | `lang` dinámico + provider de mensajes |
| `middleware.ts` | Modified | Merge con middleware de next-intl |
| `messages/` | New | 4 locales × N namespaces |
| `i18n/` | New | `routing.ts`, `request.ts`, `navigation.ts` |
| `components/**` | Modified | Strings → claves de traducción |
| `lib/cms/**` | Unchanged | CMS sigue español |

---

## 6. Risks

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Merge de middleware rompe CORS/rate-limit de `/api/*` | Alta | Excluir `/api` del matcher i18n; CORS se resuelve primero y retorna temprano |
| Colisión `[locale]` vs `[...slug]` | Media | `localePrefix: 'as-needed'` + validación estricta de locale en `routing.ts`; el segmento locale nunca entra al array de slug |
| Componentes cliente sin provider (`useTranslations` explota) | Media | Provider en el root layout, por encima de todo `'use client'` |
| Regresión de URLs y enlaces internos | Media | Usar `Link`/`redirect` de `i18n/navigation`; smoke test de las 8 rutas en `es` |
| Catálogos `gn`/`pt-BR` incompletos | Alta | Fallback explícito a `es` por clave; no fallar el render |

---

## 7. Rollback Plan

Todo el cambio es aditivo salvo el movimiento de `app/` → `app/[locale]/`. Rollback = revertir el PR (o el slice) con `git revert`; no hay migraciones de datos ni cambios en el CMS. Si solo falla el middleware, se puede volver al `middleware.ts` anterior y dejar `app/[locale]/` con un locale fijo mientras se corrige.

---

## 8. Dependencies

- `next-intl` (compatible con Next.js 16 App Router / React 19)
- Fuente de traducción para `gn` (diccionario en línea, confirmado por el usuario)

---

## 9. Success Criteria

- [ ] `/noticias` responde igual que hoy en español, sin prefijo ni redirect
- [ ] `/en/noticias`, `/pt-BR/noticias` y `/gn/noticias` renderizan con su UI traducida
- [ ] `<html lang>` refleja el locale activo en las 4 lenguas
- [ ] `/api/revalidate` y el resto de `/api/*` conservan headers CORS y rate-limit
- [ ] Ningún string de UI hardcodeado en los componentes migrados
- [ ] Fechas formateadas según locale (sin `'es-PY'` literal)
- [ ] `tsc --noEmit` y `next build` pasan sin errores nuevos

---

## 10. Proposal question round

Las decisiones de negocio fueron confirmadas por el usuario antes de redactar. Supuestos que conviene validar antes de `sdd-spec`:

1. El selector de idioma vive en el Header (desktop y mobile) y no requiere persistencia en cookie más allá del default de next-intl.
2. Un locale con catálogo incompleto muestra el texto en español, no la clave cruda.
3. `/gn` y `/pt-BR` se publican aunque el CMS siga en español (mezcla UI traducida + contenido español es aceptable en Fase 1).
4. No se agregan `hreflang` ni sitemaps por locale en esta fase.
