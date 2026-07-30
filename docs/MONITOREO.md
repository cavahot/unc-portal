# Monitoreo y Alertas - Portal UNC

## 📊 Visión General

Sistema integral de monitoreo que verifica la salud del Portal UNC en tiempo real:

```
┌──────────────────────────────────────────────┐
│     MONITOREO DEL SISTEMA PORTAL UNC        │
├──────────────────────────────────────────────┤
│ ✓ Health Checks (servicios)                 │
│ ✓ Métricas del sistema (CPU, RAM, etc)      │
│ ✓ Alertas automáticas                       │
│ ✓ Logs centralizados                        │
│ ✓ Dashboard visual                          │
└──────────────────────────────────────────────┘
```

---

## 🎯 Acceso al Dashboard

### URL
```
http://localhost:3002/monitoring
```

### Requisitos
- ✅ Estar logueado en el CMS
- ✅ Tener rol: Admin o superior

---

## 📈 Componentes del Sistema

### 1. **Health Checks**

Verifica que los servicios estén funcionando:

```
GET /api/health
```

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-27T15:30:00Z",
  "services": {
    "cms": { "status": "up", "responseTime": 45 },
    "database": { "status": "up", "responseTime": 12 },
    "minio": { "status": "up", "responseTime": 23 },
    "portal": { "status": "up", "responseTime": 67 }
  },
  "metrics": {
    "totalNoticias": 125,
    "noticiasEnRevision": 3
  }
}
```

**Estados Posibles:**
- `healthy` - Todos los servicios operan normalmente
- `degraded` - Algún servicio con problemas
- `unhealthy` - Uno o más servicios caídos

---

### 2. **Métricas del Sistema**

Información detallada del sistema:

```
GET /api/metrics
```

**Información que Devuelve:**
- **Uptime**: Cuánto tiempo lleva activo
- **Memoria**: Uso actual y total
- **Noticias**: Por estado (borrador, en revisión, etc)
- **Usuarios**: Total y por rol
- **Auditoría**: Registros del día

---

### 3. **Dashboard Visual**

Panel interactivo en `/monitoring`:

```
┌─────────────────────────────────────────────┐
│  Estado General: ✓ Saludable                │
├─────────────────────────────────────────────┤
│                                             │
│  [CMS ✓]  [DB ✓]  [MinIO ✓]  [Portal ✓]  │
│  45ms     12ms     23ms       67ms        │
│                                             │
├─────────────────────────────────────────────┤
│  Uptime: 10d 5h 23m                        │
│  Memoria: 456 / 1024 MB (45%)              │
│  ████████░░░░░░░░░░                        │
│                                             │
├─────────────────────────────────────────────┤
│  Noticias: 125 total (3 en revisión)       │
│  Tasa aprobación: 92%                      │
│  Usuarios: 8 (2 editores, 3 revisores)    │
│  Auditoría: 342 registros hoy              │
└─────────────────────────────────────────────┘
```

**Características:**
- Actualización automática cada 30 segundos
- Toggle para cambiar a actualización manual
- Indicadores de color (verde/amarillo/rojo)
- Métricas en tiempo real

---

### 4. **Logs Centralizados**

Archivo de logs por categoría:

```
GET /api/logs?category=api&level=error&limit=50&hours=24
```

**Categorías:**
- `cms` - Eventos del CMS Payload
- `portal` - Eventos del portal Next.js
- `database` - Eventos de PostgreSQL
- `auth` - Autenticación y autorización
- `api` - Llamadas a APIs
- `security` - Eventos de seguridad
- `performance` - Métricas de rendimiento

**Niveles:**
- `debug` - Información detallada (desarrollo)
- `info` - Información general
- `warn` - Advertencias
- `error` - Errores
- `critical` - Errores críticos

**Ubicación de Archivos:**
```
logs/
├── cms-2026-07-27.log
├── portal-2026-07-27.log
├── database-2026-07-27.log
├── api-2026-07-27.log
├── security-2026-07-27.log
└── performance-2026-07-27.log
```

---

### 5. **Alertas Automáticas**

El sistema genera alertas cuando:

```
GET /api/alerts?action=active
```

**Tipos de Alertas:**

| Tipo | Severidad | Condición |
|------|-----------|-----------|
| `service_down` | 🔴 Critical | Servicio no responde |
| `high_memory` | 🟡 Warning | >85% de memoria |
| `high_latency` | 🟡 Warning | Respuesta >2000ms |
| `failed_approval` | 🟡 Warning | >10 noticias en revisión |
| `database_connection` | 🔴 Critical | Conexión BD perdida |
| `backup_failed` | 🔴 Critical | Fallo en backup |
| `security_breach` | 🔴 Critical | Actividad sospechosa |

**Acciones:**
```bash
# Ver alertas activas
curl http://localhost:3002/api/alerts?action=active

# Ver alertas recientes (últimas 24h)
curl http://localhost:3002/api/alerts?action=recent&hours=24

# Resolver una alerta
curl -X POST http://localhost:3002/api/alerts?action=resolve \
  -H "Content-Type: application/json" \
  -d '{"alertId": "service_down-1234567890"}'

# Cambiar umbral
curl -X POST http://localhost:3002/api/alerts?action=set-threshold \
  -H "Content-Type: application/json" \
  -d '{"thresholdKey": "memoryUsagePercent", "value": 80}'
```

---

## 🔧 Configuración de Umbrales

**Valores por defecto:**

```typescript
{
  memoryUsagePercent: 85,        // Alerta si usa >85%
  responseTimeMs: 2000,          // Alerta si tarda >2s
  noticias_en_revision_hours: 48, // Alerta si >48h sin revisar
  errorRatePercent: 5            // Alerta si >5% errores
}
```

**Cambiar umbrales:**
```bash
curl -X POST http://localhost:3002/api/alerts?action=set-threshold \
  -H "Content-Type: application/json" \
  -d '{"thresholdKey": "memoryUsagePercent", "value": 75}'
```

---

## 📊 Interpretación de Métricas

### Estado General

**✓ Saludable**
- Todos los servicios: UP
- Memoria: <70%
- Latencia promedio: <500ms
- Errores: <1%

**⚠ Degradado**
- 1+ servicio tiene latencia alta
- Memoria: 70-85%
- Backlog: 5-10 noticias en revisión

**✗ No Saludable**
- 1+ servicio: DOWN
- Memoria: >85%
- Conexión BD perdida

### Tasa de Aprobación

Porcentaje de noticias publicadas vs rechazadas:

```
Tasa = (publicadas / (publicadas + rechazadas)) × 100
```

**Interpretación:**
- 90-100%: Excelente calidad
- 70-90%: Buena calidad
- 50-70%: Revisar proceso
- <50%: Problema en revisión

---

## 🚨 Troubleshooting

### "El dashboard no carga"
1. Verificar que `/monitoring` es accesible
2. Revisar logs: `logs/cms-*.log`
3. Verificar base de datos

### "Las métricas no actualizan"
1. Cambiar a modo manual (click botón)
2. Esperar 30 segundos para siguiente actualización
3. Refrescar página (F5)

### "Alerta falsa (no hay problema real)"
1. Ir a `/api/alerts`
2. Click en "Resolver"
3. Opcional: Ajustar umbral

### "Un servicio muestra como DOWN pero está activo"
1. Verificar que el endpoint de health check existe
2. Revisar conectividad de red
3. Revisar logs del servicio

---

## 📈 Casos de Uso

### Monitoreo Diario
```bash
# Morning check
curl http://localhost:3002/api/health

# Ver alertas activas
curl http://localhost:3002/api/alerts?action=active
```

### Troubleshooting de Problema
```bash
# Ver errores recientes (últimas 2h)
curl "http://localhost:3002/api/logs?category=api&level=error&hours=2"

# Ver todas las métricas
curl http://localhost:3002/api/metrics
```

### Análisis de Rendimiento
```bash
# Logs de performance hoy
curl "http://localhost:3002/api/logs?category=performance&hours=24"

# Tendencia de aprobaciones
# (Ver en dashboard → Noticias → Tasa Aprobación)
```

---

## 🔐 Control de Acceso

| Acción | Permiso |
|--------|---------|
| Ver dashboard | Admin+ |
| Ver health checks | Cualquiera (público) |
| Ver logs | Admin+ |
| Resolver alertas | Admin+ |
| Cambiar umbrales | Admin+ |

---

## 📝 Mejoras Futuras

- [ ] Alertas por email/Slack
- [ ] Gráficos históricos
- [ ] Predicción de problemas (ML)
- [ ] Integración con Grafana
- [ ] Reportes automáticos
- [ ] Webhook para eventos críticos
- [ ] Dashboard móvil
- [ ] Status page pública

---

## 🎯 Checklist de Producción

Antes de llevar a producción:

- [ ] Revisar y ajustar umbrales
- [ ] Configurar notificaciones por email
- [ ] Documentar contactos de soporte
- [ ] Entrenar al equipo en alertas
- [ ] Establecer SLAs (Service Level Agreements)
- [ ] Configurar rotación de logs
- [ ] Prueba de recuperación ante fallos

---

**Última actualización:** 2026-07-27
**Versión:** 1.0 (Fase 14C - Monitoreo)
