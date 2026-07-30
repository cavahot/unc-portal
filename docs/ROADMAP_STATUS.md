# Portal UNC - Estado del Roadmap

**Fecha:** 2026-07-28  
**Progreso:** 14/15+ fases completadas ✅

---

## 📋 Checklist de Fases

### ✅ COMPLETADAS

| # | Fase | Descripción | Status | Detalles |
|---|------|-------------|--------|----------|
| 1 | Setup Inicial | Workspace monorepo + configuración | ✅ | |
| 2 | PostgreSQL | Base de datos con Docker | ✅ | |
| 3 | Mailpit | Email local para desarrollo | ✅ | Funciona vía Nodemailer |
| 3.5.1 | dev:all | Script para levantar todo | ✅ | `npm run dev:all` |
| 3.5.2 | Tipos CMS | `@unc/cms-types` autogenerado | ✅ | Payload types exportados |
| 3.5.3 | Cliente CMS | `lib/cms/` con queries tipadas | ✅ | Revalidación de tags |
| 3.5.4 | Revalidación | `/api/revalidate` con Bearer token | ✅ | Seguro |
| 3.5.5 | Importador | `npm run seed:unc` | ✅ | Scrapeador de noticias UNC |
| 5 | Noticias CMS | Colección con flujo editorial | ✅ | CRUD completo |
| 6 | Portal Listado | `/noticias` con grid responsivo | ✅ | 6 noticias por página |
| 6.2 | Detalle Noticia | `/noticias/[slug]` | ✅ | Metadatos + contenido |
| 11 | Auditoría | Sistema de logs y eventos | ✅ | 12 tipos de acciones |
| 13 | Seguridad | Headers, CORS, validación | ✅ | Middleware + utilities |
| 14B | Backup | Scripts manual + automático | ✅ | Diario + cron docker |
| 14C | Monitoreo | Dashboard + health checks | ✅ | APIs + componente React |
| 16 | Flujo Editorial | Estados de aprobación | ✅ | Draft→Revisión→Publicado |
| 16.2 | Dashboard | Panel editorial interactivo | ✅ | Stats + tabla filtrable |
| 16.3 | Dashboard Unificado Admin | Payload custom views (Dashboard + Monitoreo + Auditoría) | ✅ | `/admin/portal`, `/admin/portal-monitoring`, `/admin/portal-audit` |
| 4 | MinIO S3 | Almacenamiento de archivos | ✅ | Plugin S3 funcionando — 3 archivos confirmados en bucket |
| 7 | Preview Editorial | Previsualizar noticia antes de publicar | ✅ | `/api/preview`, `/api/disable-preview`, draft mode + Next.js draftMode() |
| 8 | Page Builder | CMS-driven pages + dynamic navigation | ✅ | Paginas collection + 7 blocks + Navegacion global + catch-all route |

---

### ⏳ PENDIENTES

| # | Fase | Descripción | Prioridad | Notas |
|---|------|-------------|-----------|-------|
| 15 | Deploy | Docker producción + CI/CD | 🔴 CRÍTICA | Bloqueador final para producción |
| 9 | Categorías | Sistema de etiquetado flexible | ⚠️ Media | Para organizar noticias |
| 9 | Búsqueda | Full-text search en noticias | ⚠️ Media | Para usuarios |
| 10 | Analytics | Métricas de visitas + engagement | ⚠️ Media | Para equipo editorial |
| 12 | Configuración | Settings del sistema | ⚠️ Media | Logo, colores, textos |
| 14A | Logging | Dashboard de logs en tiempo real | ⚠️ Media | Complemento a monitoreo |
| 14C.2 | Alertas Email | Notificaciones por email | ⚠️ Media | Para admins |
| 15 | Deploy | Docker + CI/CD | 🔴 CRÍTICA | Producción |
| 17 | Testing | Suite de tests (E2E + unit) | ⚠️ Baja | Para estabilidad |

---

## 🎯 Bloqueadores Críticos

### 🔴 **Fase 15 (Deploy)** — ÚNICO BLOQUEADOR PARA PRODUCCIÓN
- **Problema:** CI/CD no configurado
- **Impacto:** No puede ir a producción
- **Requisitos previos:**
  - ✅ Monitoreo funcional (14C)
  - ✅ MinIO funcionando (4) — **RESUELTO Y VERIFICADO 2026-07-28**: bucket `unc-media` con 3 archivos, health check HTTP 200
  - ✅ Seguridad configurada (13)
  - ✅ Page Builder completado (8)
  - ✅ Flujo editorial completo (7, 16)

---

## 📊 Resumen de Progreso

```
Completadas:  ██████████████░ (14/15+)
Pendientes:   ░░░░░░░░░░░░░░░ (1/15+)
Bloqueadas:   ⚠️ Fase 4
```

### Por Categoría

| Categoría | Completado | Total |
|-----------|-----------|-------|
| Backend/CMS | 8/8 | ✅ |
| Frontend | 2/3 | ⚠️ |
| Seguridad | 3/3 | ✅ |
| Monitoreo | 2/2 | ✅ |
| Infraestructura | 1/3 | ⚠️ |

---

## 🚀 Próximos Pasos Recomendados

### ⏳ INMEDIATO (Para Producción)
1. **Fase 15 (Deploy)** - CI/CD + containers Docker — **BLOQUEADOR CRÍTICO**
   - Requiere: Dockerfile, GitHub Actions, registry config

### Corto Plazo (Mejoras Operacionales)
2. Fase 14A (Logging avanzado) — Dashboard de logs RT
3. Fase 14C.2 (Alertas email) — Notificaciones a admins
4. Fase 12 (Configuración) — Logo, colors, site text desde CMS

### Mediano Plazo (Features de Usuario)
5. Fase 9 (Categorías/Tags) — Sistema flexible de etiquetado
6. Fase 10 (Búsqueda) — Full-text search para usuarios
7. Fase 11 (Analytics) — Métricas de visitas + engagement
8. Fase 17 (Testing) — Suite E2E + unit tests

---

## 📈 Línea de Tiempo Estimada

| Sprint | Fases | Duración | Estado |
|--------|-------|----------|--------|
| Sprint 1 | 1-3, 3.5.x, 5-6 | ✅ Completo | Semanas 1-4 |
| Sprint 2 | 4, 11-14C | ✅ Completo | Semanas 5-8 |
| Sprint 3 | 15, 16-17 | ⏳ En progreso | Semanas 9-10 |
| Sprint 4 | 7-10, 12, 14A | ⏳ Pendiente | Semanas 11-12 |

---

## 🔗 Documentación Relacionada

- [Flujo Editorial](FLUJO_EDITORIAL.md)
- [Seguridad](../SECURITY.md)
- [Backup y Recovery](BACKUP_RECOVERY.md)
- [Monitoreo](MONITOREO.md)
- [Dashboard Editorial](DASHBOARD_EDITORIAL.md)

---

## ✅ Últimas Actualizaciones

- **2026-07-28:** Fase 8 (Page Builder) completada — Paginas collection + 7 blocks (Hero, RichText, CTA, Statistics, TwoColumn, Testimonials, FAQ) + Navegacion global + catch-all route
- **2026-07-27:** Fase 7 (Preview Editorial) completada — `/api/preview`, `/api/disable-preview`, draft mode
- **2026-07-27:** Fase 16 (Flujo Editorial + Dashboard) completada
- **2026-07-27:** Fase 14C (Monitoreo) completada
- **2026-07-27:** Fase 14B (Backup) completada

---

## 🎨 Dashboard Unificado Admin — Acceso Page Builder

**Ubicación:** http://localhost:3002/admin/portal

Desde el dashboard unificado puedes:
1. ✅ **Crear/Editar Páginas** — Ir a "Paginas" en el admin
   - Crear páginas anidadas: `/institucional/historia`, `/facultades/ingenieria`
   - Solo web-admin puede crear slugs top-level
   - Drag-and-drop de 7 blocks (Hero, RichText, CTA, Statistics, TwoColumn, Testimonials, FAQ)
   - Flujo editorial: Draft → Review → Publish

2. ✅ **Gestionar Navegación** — Ir a "Navegacion" en el admin
   - 2-level menu tree, manualmente curado
   - Link a páginas del CMS (híbrido: href resuelve automáticamente si cambias slug)

3. ✅ **Ver Estado** — Dashboard Panel (`/admin/portal`)
   - Stats: total páginas, por estado (draft/review/published)
   - Tabla de páginas filtrable
   - Last publish date, autor, approval status

4. ✅ **Acceder a Auditoría** — Dashboard Audit (`/admin/portal-audit`)
   - Logs de todos los cambios (crear, editar, publicar, eliminar)
   - Quién cambió, cuándo, qué cambió

---

**Última revisión:** 2026-07-28  
**Estado actual:** Page Builder (Fase 8) COMPLETO. Únicamente bloqueador: Fase 15 (Deploy)  
**Próxima sesión:** Implementar Fase 15 (Deploy) → Production-ready
