# Flujo Editorial con Aprobación - Portal UNC

## 📋 Resumen

Sistema de aprobación editorial que garantiza calidad y control de noticias:

```
┌──────────────────────────────────────────────────────────┐
│                  FLUJO DE APROBACIÓN                     │
├──────────────────────────────────────────────────────────┤
│ 1. BORRADOR       → Editor crea noticia               │
│ 2. EN REVISIÓN    → Se envía a revisor                 │
│ 3. APROBADO/RECHAZADO → Revisor aprueba o rechaza     │
│ 4. PUBLICADO      → Editor publica en portal            │
└──────────────────────────────────────────────────────────┘
```

## 👥 Roles en el Flujo

| Rol | Acciones | Responsabilidad |
|-----|----------|-----------------|
| **Editor** (correspondent) | Crear, editar borrador, enviar a revisión | Redactar contenido |
| **Revisor** (reviewer) | Revisar, comentar, aprobar/rechazar | Validar calidad |
| **Publicador** (publisher) | Aprobar, publicar | Gestionar publicación |
| **Admin** (web-admin) | Control total | Supervisión |

## 🔄 Estados de Aprobación

| Estado | Descripción | Quién asigna | Email enviado |
|--------|-----------|--------------|--------------|
| **Borrador** | Noticia en edición | Editor | No |
| **En Revisión** | Esperando revisión | Editor | Sí (a revisor) |
| **Aprobado** | Listo para publicar | Revisor | Sí (a editor) |
| **Rechazado** | Requiere cambios | Revisor | Sí (a editor con comentarios) |
| **Publicado** | En portal público | Editor | Sí (a equipo editorial) |

## 📧 Notificaciones Automáticas

### 1. Cuando se crea una noticia
```
Para: Equipo editorial
Asunto: [UNC Portal] Nueva noticia en borrador: Título
Acción: Revisar y esperar que el editor la envíe a revisión
```

### 2. Se envía a revisión
```
Para: Revisor asignado
Asunto: [UNC Portal] Noticia en revisión: Título
Acción: Revisar contenido y decidir aprobar/rechazar
```

### 3. Es aprobada
```
Para: Editor
Asunto: [UNC Portal] Noticia aprobada: Título
Acción: Publicar cuando esté listo
```

### 4. Es rechazada
```
Para: Editor
Asunto: [UNC Portal] Noticia rechazada: Título
Contenido: Comentarios del revisor
Acción: Editar y reenviar a revisión
```

### 5. Se publica
```
Para: Equipo editorial
Asunto: [UNC Portal] Noticia publicada: Título
Acción: Verificar en portal público
```

## 🚀 Cómo Usar

### Paso 1: Editor crea noticia

```
1. Ir a CMS → Noticias → Crear nueva
2. Llenar: Título, slug, resumen, contenido, categoría
3. Guardar como Borrador (por defecto)
4. Estado de Aprobación: "Borrador"
```

### Paso 2: Editor envía a revisión

```
1. En la noticia, cambiar "Approval Status" a "En Revisión"
2. Guardar cambios
3. ✓ Se envía email al revisor
```

### Paso 3: Revisor revisa y aprueba/rechaza

```
Si APRUEBA:
├─ Cambiar "Approval Status" a "Aprobado"
├─ (Opcional) Agregar comentario en historial
└─ ✓ Se notifica al editor

Si RECHAZA:
├─ Cambiar "Approval Status" a "Rechazado"
├─ Agregar comentario explicando por qué
└─ ✓ Se notifica al editor con comentarios
```

### Paso 4: Editor publica

```
1. Si fue aprobada, cambiar "Approval Status" a "Publicado"
2. O directamente cambiar "_Status" a "Published"
3. Guardar
4. ✓ Noticia aparece en /noticias del portal
5. ✓ Se notifica al equipo editorial
```

## 📊 Historial de Aprobación

Cada noticia guarda el historial completo:

```json
{
  "approvalHistory": [
    {
      "revisor": "revisor@unc.edu.py",
      "accion": "sent_to_review",
      "fecha": "2026-07-27T15:00:00Z"
    },
    {
      "revisor": "revisor@unc.edu.py",
      "accion": "reviewed",
      "comentario": "Falta imagen destacada",
      "fecha": "2026-07-27T15:30:00Z"
    },
    {
      "revisor": "revisor@unc.edu.py",
      "accion": "approved",
      "comentario": "Aprobada",
      "fecha": "2026-07-27T16:00:00Z"
    }
  ]
}
```

## 🔍 Ver Noticias en Revisión (Dashboard)

**Opción 1: Desde CMS Admin**
```
Noticias → Filtrar por "Approval Status" = "En Revisión"
```

**Opción 2: API REST** (requiere autenticación)
```bash
GET http://localhost:3002/api/noticias?where[approvalStatus][equals]=en_revision
```

**Próximo:** Crear dashboard visual en CMS.

## 🛠️ Integración con n8n (Próximo paso)

Automaciones que se pueden hacer:

1. **Auto-notificar revisor** si no revisa en 24h
2. **Auto-aprobar** si noticias pasan validación automática
3. **Post en redes** cuando se publica
4. **Backup automático** antes de publicar
5. **Analíticas** de tiempo de aprobación

**Instalación:**
```bash
# n8n se levanta en puerto 5678
docker run -d -p 5678:3000 n8nio/n8n
```

## 📋 Tabla de Cambios de Estado

```
LEGAL TRANSITIONS:

draft ──────────→ en_revision ──────→ aprobado ──────→ publicado
                      ↓
                   rechazado ────→ (editor edita)
                                        ↓
                                    en_revision (nuevamente)

NO son válidas:
✗ draft → aprobado (saltarse revisión)
✗ publicado → en_revision (no re-revisar publicadas)
```

Implementar validaciones en Payload hooks si es necesario.

## ⚠️ Mejores Prácticas

✅ **DO:**
- Agregar comentarios descriptivos al rechazar
- Revisar dentro de 24 horas
- Incluir referencias a cambios necesarios

❌ **DON'T:**
- Cambiar estado sin revisar contenido
- Dejar noticias en "En Revisión" indefinidamente
- Publicar sin aprobación explícita

## 📞 Troubleshooting

### "No recibí email de aprobación"
1. Verificar que el email de revisor está correcto
2. Revisar logs de Mailpit: http://localhost:8025
3. Confirmar que Payload está enviando emails

### "No puedo cambiar a cierto estado"
1. Verificar tu rol (necesitas permisos)
2. Algunos cambios solo se permiten en cierto orden
3. Contactar a admin si tienes permiso correcto

### "Quiero editar una noticia ya aprobada"
1. Cambiar "_Status" a "Draft"
2. Editar contenido
3. Reenviar a revisión cuando esté listo

## 🔐 Control de Acceso

| Acción | Permiso Requerido |
|--------|------------------|
| Cambiar a "En Revisión" | Editor o superior |
| Cambiar a "Aprobado" | Revisor o superior |
| Cambiar a "Publicado" | Publisher o superior |
| Ver historial | Cualquier usuario |
| Agregar comentarios | Revisor o superior |

---

**Última actualización:** 2026-07-27
**Versión:** 1.0 (Fase 16)
