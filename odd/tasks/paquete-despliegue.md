# Paquete de despliegue guiado (instalador)

Objetivo: dejar preparado un instalador guiado que el propietario ejecute solo cuando tenga el VPS, con seguimiento por mensajes y errores explicados. Rama: `feat/paquete-despliegue` (sobre el tracker). Estrategia de entrega: PR al tracker. Runner: `node --test tests/deploy/*.test.mjs`.

## Specs

- S1 «preparemos todo en una deploy para poder configurarlo solo pero luego de poner todo en orden nuestro diseño».
- S2 «en el script debe hacer un seguimiento con mensajes al que va instalarlo si existe un error debe capturarlo y mostrarlo no el numero sino el significado del error y que hacer como una guia paso a paso como un la instalacion de un software».
- S3 El instalador avanza por pasos numerados («[3/9] …») y dice qué comprueba, qué logró o qué falló en cada uno.
- S4 Todo error se captura y se muestra como «qué pasó» (el significado, nunca solo un número de salida) y «qué hacer» (pasos numerados con los comandos), y dice cómo reanudar.
- S5 Nunca imprime ni guarda en el registro un secreto; no ejecuta nada destructivo (`down -v`, `prune`, `rm -rf`); en producción pide confirmación.
- S6 Reanudable y repetible: los pasos costosos hechos no se repiten; se puede revisar el entorno sin cambiar nada (`--solo-verificar`).
- S7 Una guía de punta a punta (`docs/deploy/INSTALACION.md`) y una lista de verificación.

## Tasks

- [x] T1 Pruebas del instalador con un `docker` simulado (S3-S6) · inline · commit: (siguiente)
- [x] T2 `scripts/deploy/instalar.sh` con catálogo de errores (S2-S6) · inline · commit: (siguiente)
- [x] T3 Guía y lista de verificación (S1, S7) · inline · commit: (siguiente)

Ruta: todas inline (sin subagentes pagos por regla del usuario). Risk: item 5 (delivery/environment: script de despliegue; no lo referencia ningún workflow, no se ejecuta en CI y no hace nada destructivo; se prueba con un `docker` simulado).

## Log

- L1 (2026-11-08) Pedido del usuario: «ok pero en el script debe hacer un seguimiento con mensajes al que va instalarlo si existe un error debe capturarlo y mostrarlo no el numero sino el significado del error y que hacer como una guia paso a paso como un la instalacion de un software» (tras: «aun no tengo el vps solo tengo el docker, quiero que preparemos todo en una deploy para poder configurarlo solo pero luego de poner todo en orden nuestro diseño»).
- L2 Decisión: bash (corre en el VPS Linux y en Git Bash/WSL con Docker Desktop); entornos `staging` (por defecto, el más seguro) y `produccion`; la primera instalación construye las imágenes en el servidor (el CI solo publica las de `main`).
- L3 Evidencia: 19 pruebas del instalador con un `docker` simulado (camino feliz de 9 pasos; Docker ausente, apagado y sin permiso; Compose ausente; sin espacio, sin red y sin memoria; migración por contraseña y por causa desconocida; base no sana; puerto ocupado; entorno incompleto, sin crear y con secretos cortos; `--generar-secretos`; `--solo-verificar`; reanudación; producción con confirmación, sin permiso de descarga, sin imagen y sin certificados; uso incorrecto; sin comandos destructivos). Rojo observado antes de escribir el script (19 de 19 fallaban). Los errores se muestran con su significado; el número de salida solo va al registro (probado con el código 137). Los secretos no aparecen en pantalla ni en el registro (probado con centinelas). 264 pruebas de despliegue y 16 guardas del arnés en verde.
- L4 **Límite honesto:** no se ejecutó Docker real (el simulador no cubre red, imágenes ni salud real). La primera corrida en el VPS validará lo que el simulador no puede; si aparece un error que el catálogo no reconoce, el instalador muestra su último texto y la ruta del registro, y se agrega al catálogo. `shellcheck` no estaba disponible; la sintaxis se comprobó con `bash -n`.
- L5 Verificación con Docker REAL (Docker Desktop del propietario, solo `--solo-verificar --generar-secretos` sobre una copia temporal, sin construir ni levantar nada): los pasos 1 a 4 pasan, y `docker compose config -q` valida `compose.staging.yaml` con el `.env.staging` generado. Sigue sin probarse en real: construcción, migraciones, arranque y salud (eso lo cubre la primera corrida).
- L6 **Prueba REAL de punta a punta** (Docker Desktop del propietario, autorizada: `bash scripts/deploy/instalar.sh --generar-secretos` en staging, desde cero): los nueve pasos terminaron en «Todo listo» sin errores. Quedaron 3 contenedores sanos (postgres, CMS y portal) publicados solo en 127.0.0.1; 22 migraciones aplicadas hasta `dependencias_01` y las 4 tablas nuevas presentes; `/`, `/en/calendario-academico`, `/en/contacto/dependencias`, `/en/preguntas-frecuentes`, `/en/mapa-sitio`, `/en/legalizaciones` y el panel del CMS responden 200; ni `PAYLOAD_SECRET` ni `POSTGRES_PASSWORD` aparecen en los registros. Con esto se cierra el límite de L4 para staging (construcción, migraciones, arranque y salud). Siguen sin probarse en real: producción con nginx/HTTPS y la descarga de imágenes del registro. Observación previa, no bloqueante: una ruta inexistente devuelve HTTP 200 (la respuesta se transmite antes de saber que no existe) pero con `noindex`.
