# Dashboard Editorial - Portal UNC

## 📊 Acceso al Dashboard

### URL
```
http://localhost:3002/dashboard
```

### Requisitos
- ✅ Estar logueado en el CMS
- ✅ Tener rol: Editor, Revisor, Publisher o Admin

---

## 🎯 Funcionalidades

### 1. **Estadísticas Rápidas**

Tarjetas en la parte superior muestran:

```
📝 Borrador      👀 En Revisión    ✅ Aprobado    ❌ Rechazado    🚀 Publicado
    5                    3              8              1               42
```

- **Click en tarjeta** → Filtrar noticias por ese estado
- **Números** → Cantidad total de noticias en cada estado

### 2. **Tabla de Noticias**

Muestra todas las noticias del estado seleccionado:

| Columna | Información | Acción |
|---------|-----------|--------|
| **Título** | Nombre + slug | Click → Editar |
| **Categoría** | Tag de categoría | Solo lectura |
| **Autor** | Email del creador | Solo lectura |
| **Actualizado** | Fecha/hora última edición | Ordenable |
| **Comentario** | Último comentario del revisor | Tooltip |

### 3. **Paginación**

- Navega por páginas de noticias (20 por página)
- Anterior/Siguiente botones
- Muestra: "Página X de Y (Total noticias)"

---

## 🚀 Flujo Típico de Uso

### Como **Editor**:

```
1. Ir a Dashboard
2. Ver tarjeta "Borrador" → Click
3. Revisar lista de mis borradores
4. Click en noticia para editar
5. Cambiar "Approval Status" a "En Revisión"
6. Guardar
7. ✓ Revisor recibe notificación
```

### Como **Revisor**:

```
1. Ir a Dashboard
2. Ver tarjeta "En Revisión" (debería tener números)
3. Click en la tarjeta
4. Ver lista de noticias pendientes
5. Click en noticia para revisar
6. Leer contenido
7. Cambiar "Approval Status" a:
   - "Aprobado" si está bien
   - "Rechazado" si necesita cambios
8. Guardar
9. ✓ Editor recibe notificación
```

### Como **Publisher**:

```
1. Ir a Dashboard
2. Ver tarjeta "Aprobado"
3. Click en tarjeta
4. Ver noticias listas para publicar
5. Click en noticia
6. Cambiar "Approval Status" a "Publicado"
7. (Opcional) Cambiar "_Status" a "Published"
8. Guardar
9. ✓ Noticia aparece en portal
```

---

## 📈 Estadísticas por Estado

### Borrador (📝)
- Noticias en edición
- Solo visible para editor
- Acción: Enviar a revisión

### En Revisión (👀)
- Esperando revisión
- Visible para revisores y admins
- Acción: Aprobar o rechazar

### Aprobado (✅)
- Listo para publicar
- Visible para editores y publishers
- Acción: Publicar

### Rechazado (❌)
- Requiere cambios
- Visible para autor
- Acción: Editar y reenviar

### Publicado (🚀)
- En el portal público
- Visible para todos
- Acción: Editar o archivar

---

## 🎨 Interfaz Visual

### Elementos Interactivos

```
┌─────────────────────────────────────────────┐
│  📋 Dashboard Editorial                     │
├─────────────────────────────────────────────┤
│                                             │
│  [📝 5] [👀 3] [✅ 8] [❌ 1] [🚀 42]       │
│   Click para filtrar                        │
│                                             │
├─────────────────────────────────────────────┤
│  En Revisión (3 noticias)                  │
├─────────────────────────────────────────────┤
│                                             │
│  Título / slug  │  Cat  │  Autor  │ Fecha  │
│  ─────────────────────────────────────────   │
│  Noticia 1      │  News │  editor │ Jul 27  │
│  Noticia 2      │  News │  editor │ Jul 26  │
│  Noticia 3      │  News │  editor │ Jul 25  │
│                                             │
│  Página 1 de 1 (3 total)                   │
│  [← Anterior] [Siguiente →]                │
└─────────────────────────────────────────────┘
```

### Colores de Estado

```
Borrador      → Gris
En Revisión   → Amarillo
Aprobado      → Verde
Rechazado     → Rojo
Publicado     → Azul
```

---

## ⚡ Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| Click en fila | Abrir noticia para editar |
| Click en tarjeta | Filtrar por estado |

---

## 🔍 Filtros y Búsqueda

**Actual:** Filtro por estado

**Próximas mejoras:**
- [ ] Búsqueda por título
- [ ] Filtro por categoría
- [ ] Filtro por autor
- [ ] Filtro por fecha
- [ ] Ordenamiento personalizado

---

## 📱 Responsive

Dashboard es responsive:
- **Desktop**: Tabla completa
- **Tablet**: Tabla con scroll horizontal
- **Móvil**: Tarjetas de estadísticas + lista simplificada

---

## 🔐 Control de Acceso

| Acción | Permisos |
|--------|----------|
| Ver dashboard | Editor+ |
| Ver borrador | Editor+ |
| Ver en revisión | Revisor+ |
| Ver aprobado | Editor+ |
| Cambiar estado | Rol requerido |
| Click para editar | Permiso de edición |

---

## 🆘 Troubleshooting

### "El dashboard carga pero no muestra noticias"
- Verificar que hay noticias creadas
- Verificar conexión a PostgreSQL
- Revisar console del navegador

### "Los números no actualizan"
- Refrescar página (F5)
- Limpiar caché del navegador
- Las actualizaciones no son en tiempo real (próxima mejora)

### "No puedo hacer click en algunas noticias"
- Verificar que tienes permisos de edición
- Revisar tu rol en Usuarios

### "Falta el dashboard en el menú CMS"
- El dashboard no está en el menú por defecto
- Accede directo: http://localhost:3002/dashboard

---

## 🎯 Características Futuras

- [ ] Actualización en tiempo real (WebSocket)
- [ ] Gráficos de velocidad de aprobación
- [ ] Métricas por autor
- [ ] Alertas de noticias pendientes >24h
- [ ] Exportar reportes
- [ ] Bulk actions (editar múltiples)

---

**Última actualización:** 2026-07-27
**Versión:** 1.0 (Fase 16 - Dashboard)
