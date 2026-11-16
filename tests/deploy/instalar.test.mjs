// Instalador guiado `scripts/deploy/instalar.sh` — seguimiento por pasos y errores explicados (tarea: paquete de despliegue).
// Qué hace: ejecuta el script con un `docker` SIMULADO (un script en el PATH que responde según FAKE_SCENARIO) sobre un
//   proyecto temporal, y comprueba que cada falla conocida se muestre como «qué pasó» + «qué hacer» (el significado, no el
//   número de salida), que nunca se impriman secretos y que no se ejecute nada destructivo.
// Amenazas: (1) un error mostrado como número críptico; (2) un secreto en pantalla o en el registro; (3) un comando
//   destructivo (`down -v`, `prune`, `rm -rf`); (4) repetir pasos costosos al reanudar; (5) avanzar con un entorno incompleto.
// Límite: no usa Docker real; la primera corrida en el servidor valida lo que el simulador no puede (red, imágenes, salud real).
// Spec: odd/tasks/paquete-despliegue.md S2-S6.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(ROOT, 'scripts', 'deploy', 'instalar.sh').replace(/\\/g, '/')
const EXAMPLE_STAGING = readFileSync(join(ROOT, 'infrastructure', 'docker', '.env.staging.example'), 'utf8')
const EXAMPLE_PROD = readFileSync(join(ROOT, 'infrastructure', 'docker', '.env.prod.example'), 'utf8')
const bashOk = spawnSync('bash', ['-c', 'echo ok'], { encoding: 'utf8' }).stdout?.trim() === 'ok'
const opts = { skip: bashOk ? false : 'bash no disponible' }

/** Shim de `docker`: responde según FAKE_SCENARIO y registra cada llamada en FAKE_DOCKER_LOG. */
const SHIM = `#!/usr/bin/env bash
echo "$*" >> "\${FAKE_DOCKER_LOG:-/dev/null}"
S="\${FAKE_SCENARIO:-ok}"
all="$*"
case "$1" in
  info)
    case "$S" in
      daemon_abajo) echo "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?" >&2; exit 1;;
      sin_permiso) echo "permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock" >&2; exit 1;;
    esac; echo "Server Version: 27.0"; exit 0;;
  compose)
    if [ "$2" = "version" ]; then
      [ "$S" = "sin_compose" ] && { echo "docker: 'compose' is not a docker command." >&2; exit 1; }
      echo "Docker Compose version v2.29.0"; exit 0
    fi
    case "$all" in
      *" config "*) [ "$S" = "yaml_malo" ] && { echo "yaml: line 3: mapping values are not allowed in this context" >&2; exit 1; }; exit 0;;
      *" build"*)
        case "$S" in
          sin_espacio) echo "failed to write: no space left on device" >&2; exit 1;;
          red) echo "dial tcp: lookup registry-1.docker.io: no such host" >&2; exit 1;;
          oom) echo "Killed" >&2; exit 137;;
        esac; echo "built"; exit 0;;
      *" pull"*)
        case "$S" in
          sin_pull) echo "Error response from daemon: pull access denied for ghcr.io/cavahot/unc-portal, repository does not exist or may require 'docker login': denied: requested access to the resource is denied" >&2; exit 1;;
          tag_inexistente) echo "manifest for ghcr.io/cavahot/unc-portal:sha-abc not found: manifest unknown" >&2; exit 1;;
        esac; exit 0;;
      *" run "*)
        case "$S" in
          migracion_clave) echo "error: password authentication failed for user \\"unc_cms_staging\\"" >&2; exit 1;;
          migracion_otro) echo "algo raro paso en la migracion" >&2; exit 1;;
        esac; echo "Migrated"; exit 0;;
      *" up "*)
        case "$S" in
          puerto) echo "Bind for 0.0.0.0:3100 failed: port is already allocated" >&2; exit 1;;
          cert) echo "nginx: [emerg] cannot load certificate \\"/etc/nginx/certs/www_fullchain.pem\\": BIO_new_file() failed" >&2; exit 1;;
        esac; exit 0;;
    esac; exit 0;;
  inspect)
    [ "$S" = "pg_enfermo" ] && { echo "unhealthy"; exit 0; }
    echo "healthy"; exit 0;;
  ps) [ "$S" = "ya_corre" ] && echo "unc-portal-staging"; exit 0;;
  logs) echo "ultima linea del registro del contenedor"; exit 0;;
  volume) exit 0;;
  exec) echo '{"status":"ok"}'; exit 0;;
esac
exit 0
`

function proyecto({ entorno = 'staging', envText, sinShim = false } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'instalar-'))
  const raiz = join(base, 'repo')
  const dock = join(raiz, 'infrastructure', 'docker')
  mkdirSync(dock, { recursive: true })
  writeFileSync(join(dock, `compose.${entorno === 'produccion' ? 'prod' : 'staging'}.yaml`), `name: unc-${entorno === 'produccion' ? 'prod' : 'staging'}\n`)
  writeFileSync(join(dock, '.env.staging.example'), EXAMPLE_STAGING)
  writeFileSync(join(dock, '.env.prod.example'), EXAMPLE_PROD)
  if (entorno === 'produccion') {
    mkdirSync(join(raiz, 'infrastructure', 'nginx', 'certs'), { recursive: true })
    writeFileSync(join(raiz, 'infrastructure', 'nginx', 'nginx.conf'), readFileSync(join(ROOT, 'infrastructure', 'nginx', 'nginx.conf'), 'utf8'))
  }
  if (envText !== undefined) writeFileSync(join(dock, entorno === 'produccion' ? '.env.prod' : '.env.staging'), envText)
  const bin = join(base, 'bin')
  mkdirSync(bin)
  if (!sinShim) {
    writeFileSync(join(bin, 'docker'), SHIM)
    chmodSync(join(bin, 'docker'), 0o755)
  }
  return { base, raiz, dock, bin, dockerLog: join(base, 'docker.log') }
}

/** Valores de ejemplo -> centinelas únicos y largos, para comprobar después que no se imprimen. */
function envValido(example) {
  const vistos = new Map()
  return example.replace(/REEMPLAZAR_[A-Z_]+/g, (m) => {
    if (!vistos.has(m)) vistos.set(m, `Zq${vistos.size}`.padEnd(48, 'k'))
    return vistos.get(m)
  })
}

function correr(p, args = [], extraEnv = {}) {
  const r = spawnSync('bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${p.bin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
      INSTALAR_RAIZ: p.raiz.replace(/\\/g, '/'),
      NO_COLOR: '1',
      INSTALAR_ESPERA_MAX: '2',
      FAKE_DOCKER_LOG: p.dockerLog.replace(/\\/g, '/'),
      ...extraEnv,
    },
    timeout: 60000,
  })
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`
  const logs = readdirSync(p.raiz).filter((f) => /^instalacion-.*\.log$/.test(f))
  const log = logs.length ? readFileSync(join(p.raiz, logs.sort().pop()), 'utf8') : ''
  const docker = existsSync(p.dockerLog) ? readFileSync(p.dockerLog, 'utf8') : ''
  return { code: r.status, out, log, docker }
}

const staging = (extra) => proyecto({ envText: envValido(EXAMPLE_STAGING), ...extra })
const SENTINELAS = /Zq\d+k{10,}/

test('(1) camino feliz: nueve pasos numerados, termina bien y no imprime secretos', opts, () => {
  const p = staging()
  const r = correr(p)
  assert.equal(r.code, 0, r.out)
  for (let i = 1; i <= 9; i++) assert.match(r.out, new RegExp(`\\[${i}/9\\]`), `falta el paso ${i}`)
  assert.match(r.out, /instalación terminó|Todo listo/i)
  assert.doesNotMatch(r.out, SENTINELAS)
  assert.doesNotMatch(r.log, SENTINELAS)
  assert.match(r.log, /EJECUTA/)
})

test('(2) Docker no instalado: dice qué pasó y cómo instalarlo', opts, () => {
  const p = staging({ sinShim: true })
  const r = correr(p, [], { DOCKER_BIN: 'docker-que-no-existe' })
  assert.equal(r.code, 1)
  assert.match(r.out, /Qué pasó/)
  assert.match(r.out, /Docker no está instalado/)
  assert.match(r.out, /Qué hacer/)
  assert.match(r.out, /1\. /)
  assert.match(r.out, /vuelva a ejecutar/i)
})

test('(3) Docker apagado y sin permiso se explican distinto', opts, () => {
  const a = correr(staging(), [], { FAKE_SCENARIO: 'daemon_abajo' })
  assert.equal(a.code, 1)
  assert.match(a.out, /está instalado pero no está encendido/)
  const b = correr(staging(), [], { FAKE_SCENARIO: 'sin_permiso' })
  assert.match(b.out, /no tiene permiso para usar Docker/)
  assert.match(b.out, /usermod -aG docker/)
})

test('(4) Compose v2 ausente', opts, () => {
  const r = correr(staging(), [], { FAKE_SCENARIO: 'sin_compose' })
  assert.equal(r.code, 1)
  assert.match(r.out, /Docker Compose/)
  assert.match(r.out, /docker-compose-plugin|Docker Desktop/)
})

test('(5) errores al construir: sin espacio, sin red y sin memoria (se muestra el significado, no el número)', opts, () => {
  const e = correr(staging(), [], { FAKE_SCENARIO: 'sin_espacio' })
  assert.match(e.out, /No hay espacio en el disco/)
  assert.match(e.out, /docker image prune|liberar/i)
  const r = correr(staging(), [], { FAKE_SCENARIO: 'red' })
  assert.match(r.out, /No se pudo (conectar|llegar)/)
  const o = correr(staging(), [], { FAKE_SCENARIO: 'oom' })
  assert.match(o.out, /se quedó sin memoria/)
  assert.doesNotMatch(o.out, /137/, 'el número de salida solo va al registro, no a la pantalla')
  assert.match(o.log, /137/)
})

test('(6) migración fallida por contraseña y por causa desconocida', opts, () => {
  const a = correr(staging(), [], { FAKE_SCENARIO: 'migracion_clave' })
  assert.equal(a.code, 1)
  assert.match(a.out, /contraseña de la base de datos no coincide/)
  assert.match(a.out, /volumen/i)
  const b = correr(staging(), [], { FAKE_SCENARIO: 'migracion_otro' })
  assert.match(b.out, /migración no terminó bien/)
  assert.match(b.out, /instalacion-staging-.*\.log/)
})

test('(7) la base de datos no se pone sana a tiempo', opts, () => {
  const r = correr(staging(), [], { FAKE_SCENARIO: 'pg_enfermo' })
  assert.equal(r.code, 1)
  assert.match(r.out, /no llegó a estar sana|no se puso sana/)
  assert.match(r.out, /ultima linea del registro del contenedor/)
})

test('(8) puerto ocupado antes de empezar', opts, async () => {
  const srv = net.createServer()
  await new Promise((res) => srv.listen(3100, '127.0.0.1', res)).catch(() => null)
  if (!srv.listening) return // el puerto ya lo usa otro proceso de la máquina: la comprobación real queda cubierta
  try {
    const r = correr(staging())
    assert.equal(r.code, 1)
    assert.match(r.out, /puerto 3100/)
    assert.match(r.out, /ya lo está usando/)
  } finally {
    srv.close()
  }
})

test('(9) entorno sin crear: copia el ejemplo y se detiene pidiendo completarlo (código 3)', opts, () => {
  const p = proyecto({})
  const r = correr(p)
  assert.equal(r.code, 3)
  assert.ok(existsSync(join(p.dock, '.env.staging')))
  assert.match(r.out, /Complete el archivo/)
  assert.match(r.out, /POSTGRES_PASSWORD/)
})

test('(10) variables sin reemplazar: lista los NOMBRES y nunca los valores', opts, () => {
  const parcial = envValido(EXAMPLE_STAGING).replace(/^PAYLOAD_SECRET=.*$/m, 'PAYLOAD_SECRET=REEMPLAZAR_SECRETO_PAYLOAD_STAGING')
  const r = correr(proyecto({ envText: parcial }))
  assert.equal(r.code, 3)
  assert.match(r.out, /PAYLOAD_SECRET/)
  assert.doesNotMatch(r.out, SENTINELAS)
})

test('(11) variable obligatoria ausente y secreto demasiado corto', opts, () => {
  const sinVar = envValido(EXAMPLE_STAGING).replace(/^MEDIA_HOSTNAME=.*\n?/m, '')
  const a = correr(proyecto({ envText: sinVar }))
  assert.equal(a.code, 3)
  assert.match(a.out, /MEDIA_HOSTNAME/)
  const corto = envValido(EXAMPLE_STAGING).replace(/^PAYLOAD_SECRET=.*$/m, 'PAYLOAD_SECRET=corto')
  const b = correr(proyecto({ envText: corto }))
  assert.equal(b.code, 3)
  assert.match(b.out, /PAYLOAD_SECRET.*(32|corto)/s)
})

test('(12) --generar-secretos rellena los secretos sin imprimirlos y deja la URI de la base coherente', opts, () => {
  const p = proyecto({ envText: EXAMPLE_STAGING })
  const r = correr(p, ['--generar-secretos'])
  const env = readFileSync(join(p.dock, '.env.staging'), 'utf8')
  const val = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? ''
  for (const k of ['PAYLOAD_SECRET', 'PREVIEW_SECRET', 'REVALIDATION_SECRET', 'POSTGRES_PASSWORD']) {
    assert.ok(val(k).length >= 24 && !val(k).includes('REEMPLAZAR_'), `${k} no se generó`)
    assert.ok(!r.out.includes(val(k)), `${k} se imprimió`)
    assert.ok(!r.log.includes(val(k)), `${k} quedó en el registro`)
  }
  assert.ok(val('DATABASE_URI').includes(val('POSTGRES_PASSWORD')))
  assert.equal(r.code, 0, r.out)
  assert.ok(readdirSync(p.dock).some((f) => f.startsWith('.env.staging.copia-')), 'debe dejar una copia del archivo anterior')
})

test('(13) --solo-verificar no cambia nada: no construye, no migra, no levanta', opts, () => {
  const p = staging()
  const r = correr(p, ['--solo-verificar'])
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /\[1\/9\]/)
  assert.doesNotMatch(r.docker, /\bbuild\b|\brun\b|\bup\b|\bpull\b/)
})

test('(14) reanudar: los pasos costosos ya hechos no se repiten', opts, () => {
  const p = staging()
  assert.equal(correr(p).code, 0)
  const antes = readFileSync(p.dockerLog, 'utf8').split('\n').filter((l) => /\bbuild\b/.test(l)).length
  const seg = correr(p)
  assert.equal(seg.code, 0, seg.out)
  assert.match(seg.out, /ya (está hecho|se hizo)/i)
  const despues = readFileSync(p.dockerLog, 'utf8').split('\n').filter((l) => /\bbuild\b/.test(l)).length
  assert.equal(despues, antes, 'no debe volver a construir')
  const forzado = correr(p, ['--rehacer'])
  assert.equal(forzado.code, 0)
  assert.ok(readFileSync(p.dockerLog, 'utf8').split('\n').filter((l) => /\bbuild\b/.test(l)).length > antes)
})

test('(15) producción: pide confirmación, y sin imagen publicada explica cómo seguir', opts, () => {
  const envProd = envValido(EXAMPLE_PROD)
  const p = proyecto({ entorno: 'produccion', envText: envProd })
  for (const f of ['www_fullchain.pem', 'www_privkey.pem', 'cms_fullchain.pem', 'cms_privkey.pem']) writeFileSync(join(p.raiz, 'infrastructure', 'nginx', 'certs', f), 'x')
  const sinConfirmar = correr(p, ['--entorno', 'produccion', '--tag', 'sha-abc'], { FAKE_SCENARIO: 'ok' })
  assert.notEqual(sinConfirmar.code, 0)
  assert.match(sinConfirmar.out, /PRODUCCION/)
  const r = correr(p, ['--entorno', 'produccion', '--tag', 'sha-abc', '--sin-confirmar'], { FAKE_SCENARIO: 'sin_pull' })
  assert.equal(r.code, 1)
  assert.match(r.out, /no tiene permiso para descargar las imágenes/)
  assert.match(r.out, /docker login ghcr\.io/)
  assert.match(r.out, /--construir/)
  const t = correr(p, ['--entorno', 'produccion', '--tag', 'sha-abc', '--sin-confirmar', '--rehacer'], { FAKE_SCENARIO: 'tag_inexistente' })
  assert.match(t.out, /esa versión de la imagen no existe|La versión .* no existe/)
})

test('(16) producción: faltan los certificados de nginx', opts, () => {
  const p = proyecto({ entorno: 'produccion', envText: envValido(EXAMPLE_PROD) })
  const r = correr(p, ['--entorno', 'produccion', '--tag', 'sha-abc', '--sin-confirmar'])
  assert.equal(r.code, 1)
  assert.match(r.out, /certificados/)
  assert.match(r.out, /www_fullchain\.pem/)
})

test('(17) uso incorrecto: entorno inválido y ayuda (código 2)', opts, () => {
  const p = staging()
  const r = correr(p, ['--entorno', 'otro'])
  assert.equal(r.code, 2)
  assert.match(r.out, /staging|produccion/)
  const h = correr(p, ['--ayuda'])
  assert.equal(h.code, 0)
  assert.match(h.out, /--solo-verificar/)
  assert.match(h.out, /--generar-secretos/)
})

test('(18) nunca ejecuta comandos destructivos', opts, () => {
  const todos = ['ok', 'migracion_otro', 'oom', 'pg_enfermo'].map((s) => correr(staging(), [], { FAKE_SCENARIO: s }).docker).join('\n')
  // `run --rm cms-migrate` es legítimo (borra solo el contenedor temporal de la migración); lo prohibido es borrar recursos.
  assert.doesNotMatch(todos, /\bdown\b|\bprune\b|(^|\s)(container|volume|image|network) rm\b|^rm\b| -v\b/m)
  const code = readFileSync(join(ROOT, 'scripts', 'deploy', 'instalar.sh'), 'utf8')
  assert.doesNotMatch(code.replace(/^\s*#.*$/gm, '').replace(/(printf|echo|dice|paso_)[^\n]*/g, ''), /rm -rf|down -v|--force|system prune/)
})

test('(19) el script tiene sintaxis válida', opts, () => {
  const r = spawnSync('bash', ['-n', SCRIPT], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
})
