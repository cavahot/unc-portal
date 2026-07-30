# Seguridad del Portal UNC - Fase 13

## 🔒 Implementación de Seguridad Institucional

### 1. Headers de Seguridad ✅
- **X-Content-Type-Options: nosniff** - Previene MIME sniffing
- **X-Frame-Options: SAMEORIGIN** - Previene clickjacking
- **X-XSS-Protection: 1; mode=block** - Protección XSS
- **Content-Security-Policy** - Control de recursos de terceros
- **Strict-Transport-Security** - Fuerza HTTPS (1 año)
- **Referrer-Policy** - Control de información de referencia
- **Permissions-Policy** - Restringe APIs (camera, micrófono, geolocalización)

### 2. CORS Configurado ✅
- Solo localhost:3000 y localhost:3002 permitidos
- Credenciales permitidas
- Métodos: GET, POST, PUT, DELETE
- Headers: Content-Type, Authorization, X-Requested-With

### 3. Validación de Entrada ✅
Ubicación: `lib/security/input-validation.ts`

**Validaciones disponibles:**
- Sanitización de strings (previene XSS)
- Validación de slugs (alfanuméricos + guiones)
- Validación de emails
- Validación de URLs
- Validación de números
- Validación de tipos de archivo
- Validación de tamaño de archivo
- Validación de JSON

**Uso:**
```typescript
import { InputValidator } from '@/lib/security/input-validation'

// Sanitizar input de usuario
const safe = InputValidator.sanitizeString(userInput)

// Validar email
if (InputValidator.validateEmail(email)) {
  // procesar
}

// Validar slug
if (InputValidator.validateSlug(slug)) {
  // procesar
}
```

### 4. Rate Limiting ✅
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Límite: 100 requests por hora
- Implementar en producción con servicio externo (Redis, etc.)

### 5. Autenticación y Sesiones ✅
**Portal (Next.js):**
- No requiere autenticación
- Acceso público a noticias publicadas

**CMS (Payload):**
- Requerida autenticación con email/password
- Roles: superadmin, web-admin, publisher, reviewer, editor, correspondent, media-manager, auditor, viewer
- JWT tokens con expiración
- Cookies secure, httponly, sameSite=strict

### 6. Base de Datos
- PostgreSQL con autenticación
- Contraseñas almacenadas con bcrypt en Payload
- Migraciones versionadas

### 7. Variables de Entorno 🔐
**No registrar en Git:**
- DATABASE_URI
- PAYLOAD_SECRET
- SMTP_PASSWORD
- S3_SECRET_ACCESS_KEY
- API_KEYS

Ver `.env.example` para estructura.

### 8. Validación en API

**Endpoint de Noticias:**
```bash
# Solo lectura pública, sin autenticación
GET /api/noticias?limit=6&sort=-publishedAt

# Querys validados
GET /api/noticias?where[slug][equals]=slug-noticia
```

**Endpoint de Auditoría:**
```bash
# Requiere autenticación
GET /api/auditoria?limit=50&usuario=email@unc.edu.py
```

### 9. Seguridad de Archivos

**Restricciones:**
- Tipos permitidos: jpg, jpeg, png, gif, webp, pdf
- Tamaño máximo: 5MB por archivo
- Almacenamiento: MinIO S3 (bucket privado)
- URLs de acceso: revalidadas por token

### 10. Monitoreo y Logs

**Sistema de Auditoría (Fase 11):**
- Registra todas las acciones de usuarios
- Captura: usuario, rol, acción, IP, resultado, cambios
- Endpoint: `GET /api/auditoria`
- Retención: indefinida (revisar política)

### 11. Procedimientos de Seguridad

**Para Desarrolladores:**
1. Usar `InputValidator` para validar entrada de usuarios
2. Validar query parameters en rutas dinámicas
3. Usar HTTPS en producción
4. Configurar CORS según dominio
5. No registrar secretos en Git
6. Rotar contraseñas regularmente

**Para Administradores:**
1. Revisar logs de auditoría regularmente
2. Monitorear acceso no autorizado
3. Mantener actualizaciones de seguridad
4. Realizar copias de seguridad
5. Verificar permisos de usuario

### 12. Producción - Checklist

- [ ] Cambiar `http://localhost` por dominio real
- [ ] Configurar HTTPS/TLS válido
- [ ] Actualizar CORS con dominio real
- [ ] Usar variables de entorno reales
- [ ] Configurar rate limiting con Redis
- [ ] Revisar CSP para dominios necesarios
- [ ] Implementar WAF (Web Application Firewall)
- [ ] Configurar backups automáticos
- [ ] Habilitar logging y monitoreo
- [ ] Auditoría de permisos de base de datos

### 13. Cumplimiento Legal

**Datos Personales:**
- GDPR: Derecho al olvido (eliminar usuario)
- LPDP (Paraguay): Consentimiento informado
- Auditoría: Registro de acceso a datos

**Implementar:**
- [ ] Política de privacidad
- [ ] Términos de servicio
- [ ] Consentimiento de cookies
- [ ] Derecho al olvido

---

**Última actualización:** 2026-07-27
**Versión:** 1.0 (Fase 13)
