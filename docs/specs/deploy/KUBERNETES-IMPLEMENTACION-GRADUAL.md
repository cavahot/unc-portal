# Portal UNC — Implementación gradual en Kubernetes

**Estado:** propuesta ejecutable para revisión del equipo de desarrollo/DevOps
**Alcance:** producción y staging del Portal UNC, sin reemplazar Docker Compose local
**Objetivo:** ejecutar las imágenes Docker actuales en Kubernetes con el menor cambio posible en código, configuración y flujo CI/CD.
**No incluido:** migración de PostgreSQL a Pods en la primera fase, rediseño de la aplicación, cambio de dominio, cambio de proveedor de correo o migración destructiva de media.

> **Regla principal:** Kubernetes reemplaza inicialmente la capa de ejecución, no la aplicación. Los Dockerfiles, las imágenes, las variables contractuales, el Job de migración y los health checks deben conservar su significado.

---

## 1. Decisión de arquitectura

### 1.1 Componentes actuales que se conservan

La fuente actual es `infrastructure/docker/compose.prod.yaml` y contiene:

- `postgres`;
- `cms-migrate`;
- `cms`;
- `portal`;
- `nginx`;
- `s3` opcional mediante el perfil `s3`.

La migración inicial debe conservar:

- `Dockerfile` del portal;
- `apps/cms/Dockerfile` y su target `migrator`;
- imágenes publicadas en GHCR;
- tags inmutables por SHA;
- `DATABASE_URI` como nombre canónico;
- `CMS_URL=http://cms:3000` como comunicación interna equivalente;
- `MEDIA_STORAGE=local` o `s3` de forma explícita;
- health checks existentes como base de las probes;
- `compose.yaml` para desarrollo local;
- `compose.prod.yaml` como rollback temporal y referencia funcional.

### 1.2 Topología objetivo mínima

```text
Internet
  │
  ▼
Load Balancer / Firewall del VPS
  │  Solo 80/443 públicos
  ▼
Ingress Controller Nginx
  ├── www.unc.edu.py  → Service portal:3000
  └── cms.unc.edu.py  → Service cms:3000
                         │
                         ├── PostgreSQL gestionado o VM privada:5432
                         ├── S3/SeaweedFS privado:8333 (opcional)
                         └── SMTP privado:587/465

Kubernetes interno:
  portal Deployment
  cms Deployment
  cms-migrate Job por release
  Services ClusterIP
  Secrets externos
  ConfigMaps no sensibles
  NetworkPolicies
  Pod Security Admission
  PVC solo si media local es imprescindible
```

### 1.3 Decisiones de seguridad obligatorias

| Decisión | Regla | Motivo / amenaza cubierta |
|---|---|---|
| PostgreSQL | No ejecutar PostgreSQL dentro de Kubernetes en la fase 1 | Reduce riesgo de pérdida de datos, almacenamiento incorrecto, backup incompleto y failover falso |
| Imágenes | Usar digest o tag SHA verificable; nunca `latest` | Evita despliegues no reproducibles y rollback ambiguo |
| Secrets | External Secrets, Sealed Secrets o gestor del VPS; nunca Git | Evita exposición de contraseñas, tokens SMTP, Payload y S3 |
| Ingress | Exponer únicamente 80/443; Services internos `ClusterIP` | Evita publicación accidental de CMS, Postgres, S3 y métricas |
| CMS | `runAsNonRoot`, filesystem raíz de solo lectura cuando sea compatible | Reduce impacto de RCE o escritura persistente |
| Migraciones | Job separado, ejecutado después del backup y antes del Deployment nuevo | Evita que la aplicación arranque con esquema incompatible |
| Media | Preferir S3 privado; PVC solo con backup probado | Evita pérdida de archivos y dependencia de un Pod concreto |
| Rollback | Rollback de imagen y configuración; nunca `migrate:down` en producción | Las migraciones hacia atrás pueden destruir datos o ser incompatibles |
| Red | NetworkPolicy deny-by-default y egress mínimo | Reduce movimiento lateral y exfiltración |
| Observabilidad | Logs sin secretos, eventos de despliegue y health checks | Permite detectar fallas sin filtrar credenciales |

---

## 2. Requisitos previos y bloqueadores

No iniciar la implementación en producción hasta que todos los elementos siguientes estén demostrados en staging.

### 2.1 Requisitos técnicos

- [ ] Cluster Kubernetes disponible y soportado por el equipo.
- [ ] `kubectl` apuntando al contexto correcto.
- [ ] Contexto de producción separado del contexto de staging.
- [ ] Namespace dedicado, por ejemplo `unc-portal-prod`.
- [ ] Ingress Controller Nginx instalado y administrado.
- [ ] Cert-manager instalado, o certificados administrados fuera de Kubernetes.
- [ ] Registry GHCR accesible mediante `imagePullSecret` o identidad de workload.
- [ ] PostgreSQL externo accesible solo desde la red privada del cluster.
- [ ] Backup de PostgreSQL y restore probado en una base desechable.
- [ ] Almacenamiento S3 privado disponible, o decisión documentada de PVC.
- [ ] SMTP permitido desde el namespace solo hacia el relay requerido.
- [ ] DNS preparado para `www.unc.edu.py` y `cms.unc.edu.py`.
- [ ] Firewall permitiendo solo 80/443 y SSH administrativo restringido.
- [ ] Política de actualización y rollback aprobada.

### 2.2 Bloqueadores heredados que deben resolverse antes de producción

Según la auditoría previa del Portal UNC, el equipo debe cerrar o aceptar explícitamente:

- imagen MinIO mutable o cualquier imagen `latest` restante;
- credenciales S3/MinIO expuestas anteriormente, que deben revocarse y regenerarse;
- políticas públicas de almacenamiento;
- seeds que acepten contraseña vacía;
- vulnerabilidades de dependencias clasificadas como altas;
- backup externo y restore completo no demostrados;
- separación entre usuario de migración y usuario runtime de PostgreSQL;
- readiness que no verifique el estado real de migraciones;
- restore inconsistente entre formatos de `pg_dump`;
- rate limiting distribuido e idempotencia de rutas sensibles;
- matriz E2E de roles y transiciones editoriales.

Si alguno sigue abierto, el documento puede aplicarse a staging, pero el gate de producción debe quedar en **NO APROBADO**.

---

## 3. Repositorio y estructura de archivos

Crear la implementación en una rama aislada:

```bash
git switch -c infra/kubernetes-foundation
```

No modificar ni eliminar `infrastructure/docker/` durante esta fase.

Estructura propuesta:

```text
infrastructure/kubernetes/
├── base/
│   ├── namespace.yaml
│   ├── kustomization.yaml
│   ├── serviceaccounts.yaml
│   ├── network-policies.yaml
│   ├── pod-security.yaml
│   ├── portal-deployment.yaml
│   ├── portal-service.yaml
│   ├── cms-deployment.yaml
│   ├── cms-service.yaml
│   ├── cms-migrate-job.yaml
│   ├── ingress.yaml
│   ├── pdb.yaml
│   └── resource-quotas.yaml
├── overlays/
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patch-values.yaml
│   └── production/
│       ├── kustomization.yaml
│       └── patch-values.yaml
├── README.md
└── SECURITY-CHECKLIST.md
```

> **Regla de configuración:** los valores no sensibles pueden vivir en `ConfigMap` o patches Kustomize. Los valores sensibles deben llegar mediante un gestor externo. No crear `secret.yaml` con valores reales dentro del repositorio.

---

## 4. Paso 1 — Crear namespace y controles base

### 4.1 Namespace

Crear `infrastructure/kubernetes/base/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: unc-portal
  labels:
    # Este label activa el modo restricted de Pod Security Admission.
    # Amenaza cubierta: Pods privilegiados, root y montajes inseguros.
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Para staging usar `unc-portal-staging`; para producción usar `unc-portal-prod`. No compartir Secrets entre namespaces.

### 4.2 ServiceAccounts

Crear ServiceAccounts separados:

- `portal-runtime`;
- `cms-runtime`;
- `cms-migrator`;
- `deployment-runner`, solo si el pipeline necesita operar el cluster.

Reglas:

- `automountServiceAccountToken: false` para `portal-runtime` y `cms-runtime`;
- no asignar `cluster-admin` al pipeline;
- `cms-migrator` solo necesita permisos si el mecanismo de migración requiere consultar recursos Kubernetes; preferir cero permisos Kubernetes;
- usar RBAC namespaced;
- registrar cualquier excepción con ticket y fecha de expiración.

---

## 5. Paso 2 — Configuración y Secrets

### 5.1 Configuración no sensible

Mover a `ConfigMap` únicamente valores como:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: unc-portal-config
  namespace: unc-portal-prod
data:
  NODE_ENV: production
  MEDIA_STORAGE: local
  MEDIA_DIR: /app/media
  MEDIA_MAX_BYTES: "10485760"
  POSTGRES_SSL: "true"
  S3_REGION: us-east-1
  CMS_INTERNAL_URL: http://cms:3000
```

El comentario de cada clave debe explicar qué componente la consume y su límite. No guardar URLs con credenciales.

### 5.2 Secrets

Los siguientes valores deben vivir en un gestor externo:

```text
DATABASE_URI
PAYLOAD_SECRET
PREVIEW_SECRET
REVALIDATION_SECRET
POSTGRES_PASSWORD, si se usa para una operación de administración
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
SMTP_USER
SMTP_PASSWORD
CONTACT_TO, si la política institucional lo considera sensible
NEXT_PUBLIC_SENTRY_DSN, según política de observabilidad
GHCR_PULL_TOKEN, si no se usa identidad de workload
```

Requisitos:

- mínimo 32 bytes aleatorios para secretos de firma;
- no imprimir Secrets con `kubectl get secret -o yaml`;
- no usar `stringData` con valores reales en archivos versionados;
- rotar secretos antes del primer paso a producción si hubo exposición previa;
- separar secretos de staging y producción;
- auditar quién puede leer cada secreto;
- configurar rotación y rollback de versión del secreto;
- comprobar que los logs no imprimen `DATABASE_URI`, `SMTP_PASSWORD` ni `S3_SECRET_ACCESS_KEY`.

Ejemplo conceptual de ExternalSecret, sin valores reales:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: unc-portal-runtime
  namespace: unc-portal-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: unc-production-secret-store
    kind: ClusterSecretStore
  target:
    name: unc-portal-runtime
    creationPolicy: Owner
  data:
    # La clave se resuelve en el gestor externo; nunca se escribe aquí.
    - secretKey: DATABASE_URI
      remoteRef:
        key: unc/production/database-uri
```

> Si no se dispone de External Secrets, usar Sealed Secrets o un mecanismo de secretos del proveedor. No reemplazarlo por `.env` dentro del repositorio.

---

## 6. Paso 3 — Registry e imágenes

### 6.1 Construcción

El pipeline debe:

1. ejecutar tests y guards;
2. ejecutar typecheck y lint de portal y CMS;
3. construir las imágenes Docker;
4. escanear imágenes por CVE;
5. publicar en GHCR privado;
6. obtener el digest final;
7. firmar o registrar el digest;
8. desplegar exactamente ese digest.

Ejemplo de referencia:

```bash
IMAGE_TAG="sha-${GIT_COMMIT_SHA}"

docker build -t ghcr.io/cavahot/unc-portal:${IMAGE_TAG} -f Dockerfile .
docker build -t ghcr.io/cavahot/unc-portal-cms:${IMAGE_TAG} -f apps/cms/Dockerfile .

docker push ghcr.io/cavahot/unc-portal:${IMAGE_TAG}
docker push ghcr.io/cavahot/unc-portal-cms:${IMAGE_TAG}
```

El pipeline no debe depender del tag mutable para ejecutar producción.

### 6.2 Pull de imágenes

- usar `imagePullSecrets` creado fuera del repositorio;
- preferir identidad de workload del proveedor;
- verificar que el Secret solo pueda leer el registry requerido;
- no reutilizar un token de GitHub con permisos de escritura;
- registrar imagen, digest, commit y fecha en el artefacto del deploy.

---

## 7. Paso 4 — PostgreSQL y migraciones

### 7.1 PostgreSQL

En la primera fase:

- mantener PostgreSQL fuera del cluster;
- permitir conexiones solo desde el rango privado del cluster;
- usar TLS (`POSTGRES_SSL=true`) cuando el proveedor lo soporte;
- usar un usuario runtime sin privilegios de migración;
- usar un usuario migrador separado;
- bloquear `CREATE DATABASE`, `DROP DATABASE`, ownership y superuser al runtime;
- limitar conexiones y configurar timeouts;
- activar backups automáticos y retención institucional;
- probar restore en una instancia aislada.

### 7.2 Orden exacto del release

```text
1. Verificar imagen y digest.
2. Crear backup consistente de PostgreSQL.
3. Verificar que el backup pueda restaurarse en entorno aislado.
4. Aplicar Secrets/configuración del release.
5. Ejecutar cms-migrate como Job con la imagen exacta.
6. Esperar código 0 y registrar logs sin secretos.
7. Aplicar portal y CMS.
8. Esperar readiness.
9. Ejecutar smoke tests.
10. Cambiar tráfico solo si todos los gates pasan.
```

### 7.3 Job de migración

El Job debe cumplir:

- `restartPolicy: Never`;
- `backoffLimit` bajo y explícito;
- timeout de ejecución;
- imagen del mismo digest que CMS;
- usuario migrador separado;
- sin endpoint público;
- sin `migrate:down`, `reset`, `fresh` ni comandos destructivos;
- bloqueo para impedir dos Jobs de migración simultáneos;
- retención de evidencia del resultado;
- eliminación controlada después de conservar logs.

Ejemplo estructural:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cms-migrate-RELEASE_ID
  namespace: unc-portal-prod
  annotations:
    # ARCH-DB-02: una migración debe poder asociarse al digest y al backup previo.
    release.unc.edu.py/image-digest: "sha256:REEMPLAZAR"
    release.unc.edu.py/backup-id: "REEMPLAZAR"
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 86400
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: cms-migrator
      automountServiceAccountToken: false
      containers:
        - name: cms-migrate
          image: ghcr.io/cavahot/unc-portal-cms-migrator@sha256:REEMPLAZAR
          imagePullPolicy: IfNotPresent
          securityContext:
            # SEC-K8S-01: evita que el migrador ejecute como root.
            # Límite: no sustituye la separación de privilegios de PostgreSQL.
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
          envFrom:
            - secretRef:
                name: unc-cms-migrate
            - configMapRef:
                name: unc-portal-config
```

`REEMPLAZAR` es un marcador documental y no debe llegar al cluster.

---

## 8. Paso 5 — Deployments de portal y CMS

### 8.1 Reglas comunes de seguridad del Pod

Cada Deployment debe declarar explícitamente:

```yaml
securityContext:
  # SEC-K8S-02: el contenedor no necesita privilegios del kernel para servir HTTP.
  # Amenaza cubierta: escalada desde proceso comprometido hacia el nodo.
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault

containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: [ALL]
```

Si Next.js, Payload o el logger necesitan escribir temporalmente:

- montar un `emptyDir` explícito para `/tmp`;
- limitar tamaño si el runtime lo permite;
- no hacer writable todo el filesystem;
- documentar exactamente qué ruta necesita escritura;
- añadir una prueba que falle si la aplicación intenta escribir fuera de esa ruta.

### 8.2 Recursos

Definir requests y limits iniciales medidos en staging:

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

No copiar estos valores a producción sin medir. El equipo debe registrar:

- p95 de CPU;
- p95 de memoria;
- reinicios;
- latencia;
- concurrencia;
- OOMKills.

### 8.3 Probes

Portal:

- liveness: `/api/health`;
- readiness: endpoint que confirme dependencias mínimas necesarias, no solo que el proceso está vivo;
- no incluir secretos ni detalles internos en respuestas públicas.

CMS:

- liveness: proceso HTTP;
- readiness: `/api/health/ready` o equivalente;
- debe fallar si el esquema requerido no está listo;
- no publicar el endpoint del CMS directamente a Internet.

Las probes deben tener `initialDelaySeconds`, `timeoutSeconds`, `periodSeconds` y `failureThreshold` explícitos para evitar loops de reinicio.

### 8.4 Rollout

- `replicas: 2` como mínimo para portal y CMS si el presupuesto lo permite;
- `strategy: RollingUpdate` con `maxUnavailable: 0` y `maxSurge: 1` para el portal;
- `PodDisruptionBudget` para evitar pérdida total durante mantenimiento;
- `topologySpreadConstraints` si hay más de un nodo;
- `revisionHistoryLimit` suficiente para rollback;
- no usar `:latest`;
- no permitir que dos releases incompatibles compartan migración activa.

---

## 9. Paso 6 — Servicios e Ingress

### 9.1 Services

Todos los Services internos deben ser `ClusterIP`:

- `portal` → puerto 3000;
- `cms` → puerto 3000;
- `s3` → puerto 8333, solo si se mantiene dentro del cluster y con política privada.

No usar `NodePort` ni `LoadBalancer` para portal, CMS, PostgreSQL o S3 salvo justificación aprobada.

### 9.2 Ingress

El Ingress debe:

- publicar únicamente `www.unc.edu.py` y `cms.unc.edu.py`;
- terminar TLS con certificado válido;
- redirigir HTTP a HTTPS;
- aplicar límites de tamaño de upload coherentes con `MEDIA_MAX_BYTES`;
- aplicar rate limiting en rutas sensibles;
- establecer headers de seguridad;
- bloquear métodos no utilizados;
- no reenviar headers de autenticación a destinos no autorizados;
- registrar request ID sin guardar cookies, tokens ni cuerpos sensibles;
- evitar exposición de endpoints internos.

La política CORS debe permanecer en el código y en el Ingress solo donde sea necesario. CORS no es autenticación.

---

## 10. Paso 7 — NetworkPolicies

Aplicar primero en staging y verificar logs antes de producción.

Regla base:

```text
Ingress Controller → portal:3000
Ingress Controller → cms:3000
portal → cms:3000
cms → PostgreSQL:5432
cms-migrate → PostgreSQL:5432
cms → S3:8333, solo MEDIA_STORAGE=s3
portal/cms → SMTP: puerto explícito
DNS → resolver autorizado
Todo lo demás: denegado
```

No permitir:

- Pods de la aplicación → Internet completo;
- portal → PostgreSQL;
- Ingress → PostgreSQL;
- CMS → servicios arbitrarios;
- namespace UNC → metadata service del proveedor;
- egress sin DNS ni destino documentado.

Para cada excepción registrar:

- origen;
- destino;
- puerto;
- protocolo;
- motivo;
- ticket;
- fecha de revisión;
- responsable.

---

## 11. Paso 8 — Media y almacenamiento

### Opción recomendada: S3 privado

- bucket privado por defecto;
- claves separadas por entorno;
- `S3_PUBLIC_READ=0` salvo decisión institucional documentada;
- acceso público únicamente mediante ruta controlada del portal/Ingress;
- no publicar endpoint administrativo S3;
- cifrado en reposo y tránsito;
- lifecycle para temporales;
- versionado si el costo lo permite;
- backup y restore de objetos probado;
- logs sin `S3_SECRET_ACCESS_KEY`.

### Opción temporal: PVC

Si se mantiene `MEDIA_STORAGE=local`:

- usar PVC `ReadWriteOnce` solo con un diseño de réplica compatible;
- documentar que un solo nodo puede convertirse en dependencia;
- probar backup del PVC;
- probar restore en otro PVC;
- no declarar alta disponibilidad falsa con almacenamiento no compartido;
- mantener `MEDIA_DIR=/app/media` igual que en Compose.

---

## 12. Paso 9 — CI/CD seguro

El pipeline debe tener etapas separadas:

```text
lint
  ↓
typecheck
  ↓
unit/security tests
  ↓
harness quick/full
  ↓
Docker build
  ↓
image scan
  ↓
image sign/digest
  ↓
publish GHCR
  ↓
staging deploy
  ↓
migration Job staging
  ↓
smoke + E2E sintético
  ↓
aprobación manual
  ↓
production backup
  ↓
migration Job production
  ↓
production rollout
  ↓
verification + evidence
```

El pipeline debe fallar si:

- falta `IMAGE_TAG` o digest;
- aparece una imagen mutable;
- faltan Secrets requeridos;
- el Job de migración termina distinto de 0;
- falla readiness;
- falla un test de RBAC;
- se detecta una vulnerabilidad bloqueante;
- no existe backup verificable;
- el manifiesto intenta publicar PostgreSQL o S3;
- el despliegue modifica un namespace no autorizado.

El token del pipeline debe tener mínimo privilegio:

- lectura/escritura del registry solo donde corresponda;
- permisos namespaced para desplegar;
- no `cluster-admin` permanente;
- aprobación separada para producción;
- auditoría de cada ejecución.

---

## 13. Paso 10 — Validación en staging

### 13.1 Validación estática

```bash
kubectl kustomize infrastructure/kubernetes/overlays/staging > /tmp/unc-staging.yaml
kubectl apply --dry-run=server -f /tmp/unc-staging.yaml
kubectl diff -k infrastructure/kubernetes/overlays/staging
```

Validar además:

- `kubeconform` o validador equivalente;
- `kube-linter` o equivalente;
- `trivy config`;
- ausencia de `latest`;
- ausencia de valores reales de Secrets;
- ausencia de `hostPath` no aprobado;
- ausencia de `privileged: true`;
- ausencia de `allowPrivilegeEscalation: true`;
- `runAsNonRoot` presente;
- probes presentes;
- requests/limits presentes;
- Services no públicos.

### 13.2 Aplicación controlada

```bash
kubectl config current-context
kubectl get namespace unc-portal-staging
kubectl apply -k infrastructure/kubernetes/overlays/staging
kubectl rollout status deployment/portal -n unc-portal-staging --timeout=10m
kubectl rollout status deployment/cms -n unc-portal-staging --timeout=10m
```

El responsable debe copiar a la evidencia:

- contexto Kubernetes;
- commit;
- digest de imágenes;
- manifiesto renderizado sin Secrets;
- resultado de probes;
- eventos del namespace;
- resultado del Job de migración;
- logs redactados.

### 13.3 Smoke tests obligatorios

- [ ] `www.unc.edu.py` responde HTTPS.
- [ ] `cms.unc.edu.py` responde HTTPS solo donde corresponda.
- [ ] HTTP redirige a HTTPS.
- [ ] Portal publica contenido autorizado.
- [ ] CMS exige autenticación.
- [ ] `viewer` no puede crear ni modificar contenido.
- [ ] `superadmin` puede ejecutar únicamente acciones autorizadas.
- [ ] Borradores no aparecen como publicados.
- [ ] Preview exige token válido y expira.
- [ ] Upload rechaza tamaño y MIME no autorizados.
- [ ] Media no expone listado ni credenciales.
- [ ] `/api/health` no filtra dependencias sensibles.
- [ ] `/api/health/ready` falla si CMS o DB no están listos.
- [ ] Auditoría registra actor, acción, recurso, timestamp y request ID.
- [ ] Logs no muestran secretos.
- [ ] Rollback de imagen funciona en staging.
- [ ] Restore de DB y media funciona en entorno aislado.

---

## 14. Rollback

### 14.1 Rollback de aplicación

Si falla el rollout pero la migración fue compatible:

```bash
kubectl rollout history deployment/portal -n unc-portal-prod
kubectl rollout undo deployment/portal -n unc-portal-prod --to-revision=REVISION
kubectl rollout undo deployment/cms -n unc-portal-prod --to-revision=REVISION
kubectl rollout status deployment/portal -n unc-portal-prod --timeout=10m
kubectl rollout status deployment/cms -n unc-portal-prod --timeout=10m
```

### 14.2 Si falla la migración

- detener el rollout de la aplicación;
- conservar logs y evento del Job;
- no ejecutar `migrate:down` automáticamente;
- comparar backup, versión de imagen y estado de migraciones;
- restaurar solo mediante procedimiento aprobado;
- escalar al responsable de base de datos.

### 14.3 Rollback a Compose

Compose se mantiene como fallback temporal:

1. bloquear el tráfico hacia Ingress;
2. verificar que el backup y la DB sean compatibles;
3. detener el workload Kubernetes solo cuando el tráfico esté drenado;
4. iniciar Compose con la imagen aprobada por SHA;
5. verificar health checks;
6. restaurar DNS o upstream si aplica;
7. registrar la causa y el tiempo de recuperación.

No ejecutar Compose y Kubernetes escribiendo simultáneamente sobre la misma base sin una decisión explícita de exclusión mutua.

---

## 15. Gates de aprobación

### Gate A — Diseño

- [ ] diagrama aprobado;
- [ ] límites de red aprobados;
- [ ] estrategia de PostgreSQL aprobada;
- [ ] estrategia de media aprobada;
- [ ] estrategia de Secrets aprobada;
- [ ] rollback probado en papel y staging.

### Gate B — Staging

- [ ] manifests validados;
- [ ] imágenes escaneadas y fijadas;
- [ ] namespace restringido;
- [ ] NetworkPolicies probadas;
- [ ] migración sintética correcta;
- [ ] smoke tests correctos;
- [ ] backup y restore correctos;
- [ ] logs redactados;
- [ ] rollback correcto.

### Gate C — Producción

- [ ] aprobación explícita del responsable;
- [ ] backup de producción completado;
- [ ] restore del backup verificado previamente;
- [ ] ventana de cambio definida;
- [ ] contacto de escalamiento disponible;
- [ ] digest de imagen registrado;
- [ ] manifiesto final revisado;
- [ ] Secrets cargados y no visibles en Git;
- [ ] migración ejecutada una sola vez;
- [ ] readiness y smoke tests correctos;
- [ ] evidencia archivada.

---

## 16. Entregables del desarrollador/DevOps

El trabajo no se considera terminado hasta entregar:

1. manifests Kustomize o Helm;
2. `README.md` operativo;
3. matriz de Secrets sin valores reales;
4. NetworkPolicies;
5. RBAC namespaced;
6. Job de migración;
7. probes y recursos;
8. Ingress y TLS;
9. pipeline CI/CD;
10. validaciones estáticas;
11. pruebas staging;
12. evidencia de backup/restore;
13. procedimiento de rollback;
14. diagrama actualizado;
15. registro de riesgos pendientes;
16. resultado de revisión independiente.

Cada archivo nuevo o modificado debe incluir comentarios en español que expliquen:

- qué hace;
- por qué existe;
- qué amenaza o fallo evita;
- cuál es su límite;
- qué tarea `SEC-XX`, `DEP-XX` o `ARCH-DB-XX` cubre.

---

## 17. Criterio final de aceptación

La migración se aprueba únicamente si:

```text
Docker Compose local sigue funcionando
AND
las imágenes son reproducibles
AND
no hay secretos en Git
AND
PostgreSQL no está públicamente expuesto
AND
S3/media no está públicamente administrable
AND
migraciones se ejecutan como Job controlado
AND
RBAC y transición editorial pasan pruebas negativas
AND
NetworkPolicies bloquean tráfico no requerido
AND
readiness detecta dependencias críticas
AND
backup y restore fueron demostrados
AND
rollback fue probado
AND
staging y producción tienen evidencia separada
```

Si una condición falla, el resultado es **NO APROBADO PARA PRODUCCIÓN**, aunque la aplicación responda correctamente.

---

## 18. Orden de implementación recomendado

1. Crear rama `infra/kubernetes-foundation`.
2. Crear namespace staging y aplicar Pod Security.
3. Crear Kustomize base sin Secrets reales.
4. Crear Services internos.
5. Crear Deployments portal/CMS con probes y recursos.
6. Crear Job `cms-migrate` con digest.
7. Crear Ingress en staging.
8. Crear NetworkPolicies en modo verificable.
9. Conectar PostgreSQL staging privado.
10. Ejecutar backup y restore sintético.
11. Ejecutar migración staging.
12. Ejecutar smoke tests y suite de seguridad.
13. Probar rollback.
14. Ejecutar revisión independiente.
15. Corregir hallazgos bloqueantes.
16. Repetir gates con evidencia limpia.
17. Solicitar aprobación de producción.
18. Ejecutar backup de producción.
19. Ejecutar Job de migración de producción.
20. Ejecutar rollout canary o progresivo.
21. Validar tráfico, logs, métricas y media.
22. Mantener Compose como fallback hasta cerrar el periodo de observación.
23. Documentar el cierre y los riesgos residuales.

**No implementar Kubernetes directamente en producción siguiendo solo este documento. Primero debe completarse staging con datos sintéticos y una revisión independiente.**
