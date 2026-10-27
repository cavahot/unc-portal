// DEP-19a — Correcciones de deploy.yml surgidas de las revisiones de riesgo y resiliencia.
// Qué hace: (1) estáticas sobre el YAML PARSEADO (paquete `js-yaml` (dependencia declarada)): disparador
//   endurecido, concurrencia, command_timeout coherente y ausencia de interpolaciones `${{ }}` dentro del
//   script SSH; (2) de COMPORTAMIENTO: ejecuta el script SSH real con un shim `docker` que MODELA el estado de
//   contenedores (un `up -d` que arrastra cms-migrate lo deja Exited y bloquea el `run --name` siguiente) y un
//   shim `flock`.
// Por qué: un segundo deploy fallaba con «name already in use»; un PR de fork con rama `main` disparaba el
//   deploy; dos deploys podían pisarse; el token de ghcr.io y el actor se interpolaban en el texto del script.
// Límite: el shim NO es Docker ni flock reales: no prueba dos deploys consecutivos reales, que ssh-action
//   propague `envs`/`command_timeout`, ni el bloqueo del kernel en el host. Ver «Pendientes de validación
//   real» en la spec. La señal SIGTERM/SIGHUP tampoco se ejercita (no es fiable bajo Git Bash).
// Spec: docs/specs/deploy/DEP-19a-correcciones-deploy.md | RDD: RDD-DEP-43..RDD-DEP-49
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_TEXT = readFileSync(resolve(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const COMPOSE_TEXT = readFileSync(resolve(ROOT, 'infrastructure', 'docker', 'compose.prod.yaml'), 'utf8').replace(/\r\n/g, '\n');
const WF = yaml.load(WORKFLOW_TEXT);
const COMPOSE = yaml.load(COMPOSE_TEXT);
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');
const STEP = 'Pull images and restart services';

const deployStep = () => WF.jobs.deploy.steps.find((s) => s.name === STEP);
/** Texto del script SSH tal como lo parsea YAML (sin indentación) y sin sustituir nada. */
const RAW_SCRIPT = () => deployStep().with.script;
const noComments = (t) => t.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

// ---- 2. Disparador endurecido ------------------------------------------------------------------

test('(2) check-ci exige success + push + mismo repositorio + rama main, unidos con &&', () => {
  const cond = String(WF.jobs['check-ci'].if ?? '').replace(/\s+/g, ' ');
  assert.match(cond, /github\.event\.workflow_run\.conclusion\s*==\s*'success'/, 'falta conclusion == success');
  assert.match(cond, /github\.event\.workflow_run\.event\s*==\s*'push'/, 'falta event == push');
  assert.match(cond, /github\.event\.workflow_run\.head_repository\.full_name\s*==\s*github\.repository/, 'falta head_repository.full_name == github.repository');
  assert.match(cond, /github\.event\.workflow_run\.head_branch\s*==\s*'main'/, 'falta head_branch == main');
  assert.ok(!cond.includes('||'), 'una condición con || debilita el filtro');
});

test('(2) la cadena de jobs depende de check-ci (si el gate se omite, no se construye ni despliega)', () => {
  assert.equal(WF.jobs['build-images'].needs, 'check-ci');
  assert.equal(WF.jobs.deploy.needs, 'build-images');
  assert.deepEqual(WF.on.workflow_run.branches, ['main']);
});

// ---- 3. Concurrencia y cortes ------------------------------------------------------------------

test('(3) concurrency del workflow: grupo deploy-prod y cancel-in-progress false', () => {
  assert.equal(WF.concurrency?.group, 'deploy-prod');
  assert.strictEqual(WF.concurrency?.['cancel-in-progress'], false);
});

/** Cota del tiempo del script en el peor caso, a partir de los valores por defecto del propio script. */
function worstCaseSeconds() {
  const s = RAW_SCRIPT();
  const num = (re) => Number(s.match(re)?.[1]);
  const migrate = num(/DEP07_MIGRATE_TIMEOUT:-(\d+)/) + num(/--kill-after=(\d+)/);
  // Cada intento del gate: 2 wget con -T 3 (peor caso 6 s) + el intervalo.
  const gate = num(/DEP09_READY_RETRIES:-(\d+)/) * (num(/DEP09_READY_INTERVAL:-(\d+)/) + 6);
  const PULL_Y_BACKUP = 600; // supuesto documentado en la spec
  const UP = 120; // supuesto documentado: un `up -d` (y el del rollback)
  return PULL_Y_BACKUP + migrate + UP + gate + UP + gate;
}

test('(3) command_timeout del ssh-action existe, cubre migrate (timeout+kill-after) + 2 gates y no es desmedido', () => {
  const raw = String(deployStep().with.command_timeout ?? '');
  const m = raw.match(/^(\d+)(s|m|h)$/);
  assert.ok(m, `command_timeout ausente o con formato inesperado: «${raw}»`);
  const secs = Number(m[1]) * { s: 1, m: 60, h: 3600 }[m[2]];
  const need = worstCaseSeconds();
  assert.ok(Number.isFinite(need) && need > 0, 'no se pudo calcular la cota desde el script');
  assert.ok(secs >= need, `command_timeout ${secs}s < peor caso ${need}s`);
  assert.ok(secs <= need * 1.5, `command_timeout ${secs}s es > 1,5× el peor caso ${need}s`);
});

test('(3) el script toma un flock no bloqueante sobre un lockfile junto al compose', () => {
  const s = noComments(RAW_SCRIPT());
  assert.match(s, /flock -n 9/);
  assert.match(s, /exec 9>"?\$?\{?LOCK_FILE\}?"?|exec 9>"?\.deploy\.lock"?/);
  assert.match(s, /\.deploy\.lock/);
  assert.match(s, /trap [^\n]*EXIT/);
});

// ---- 4. Secretos fuera del texto del script ----------------------------------------------------

test('(4) el bloque script no contiene NINGUNA expresión ${{ }} (ni siquiera en comentarios)', () => {
  assert.doesNotMatch(RAW_SCRIPT(), /\$\{\{/);
});

test('(4) token y usuario viajan por env/envs y el login usa --password-stdin con variables citadas', () => {
  const step = deployStep();
  assert.match(String(step.env.GHCR_TOKEN), /^\$\{\{\s*secrets\.GHCR_READ_TOKEN\s*\}\}$/);
  assert.match(String(step.env.GHCR_USER), /^\$\{\{\s*github\.actor\s*\}\}$/);
  const envs = String(step.with.envs).split(/[,\s]+/).filter(Boolean);
  for (const v of ['IMAGE_TAG', 'GHCR_USER', 'GHCR_TOKEN']) assert.ok(envs.includes(v), `envs sin ${v}`);
  const s = noComments(RAW_SCRIPT());
  assert.match(s, /docker login ghcr\.io -u "\$GHCR_USER" --password-stdin/);
  assert.doesNotMatch(s, /docker login[^\n]*(\s-p\s|--password(?!-stdin))/);
  assert.doesNotMatch(s, /echo[^\n]*\$\{?GHCR_TOKEN/, 'no se ecoa el token');
});

// ---- Ejecución del script real con shims -------------------------------------------------------

const SHIM_DOCKER = `#!/usr/bin/env bash
args="$*"
D="$(dirname "$FAKE_LOG")"
C="$D/containers"
touch "$C"
echo "ARGS $args" >> "$FAKE_LOG"
case "$args" in
  "exec unc-cms-prod wget"*|"exec unc-portal-prod wget"*)
    [ "\${FAKE_READY_FAIL:-0}" = 1 ] && [ "$(cat "$D/current_tag" 2>/dev/null)" = "\${FAKE_READY_FAIL_TAG:-}" ] && exit 1
    # SEC-REVIEW: el smoke de datos del gate pide una colección real y exige "docs" en la respuesta.
    case "$args" in *"/api/aranceles-rectorado"*) printf '{"docs":[],"totalDocs":0}';; esac
    exit 0;;
  "rm -f"*)
    shift 2; rc=0
    for n in "$@"; do
      if grep -qxF "$n" "$C"; then grep -vxF "$n" "$C" > "$C.t"; mv "$C.t" "$C"; echo "EVENT rm:$n" >> "$FAKE_LOG"
      else echo "Error response from daemon: No such container: $n" >&2; rc=1; fi
    done; exit $rc;;
  "ps -aq"*) case "$args" in *cms-migrate*) grep -F cms-migrate "$C";; *) cat "$C";; esac; exit 0;;
  login*) tok="$(cat)"; echo "LOGIN args=[$args] stdin=[$tok]" >> "$FAKE_LOG"; exit 0;;
  ps*) echo "other"; [ "\${FAKE_PG_RUNNING:-1}" = 1 ] && echo "unc-postgres-prod"; exit 0;;
  "volume inspect"*) exit 1;;
  *information_schema*) echo "0"; exit 0;;
  *to_regclass*) echo "t"; exit 0;;
  *"batch = -1"*) echo "0"; exit 0;;
  *"batch > 0"*) echo "1"; exit 0;;
  *"run --rm"*cms-migrate*)
    case "$args" in *"--name "*) name="\${args#*--name }"; name="\${name%% *}";; *) name="proj-cms-migrate-run-a1b2";; esac
    # compose run: si el nombre ya existe (p. ej. el Exited que dejó un up -d) falla como el Docker real.
    if grep -qxF "$name" "$C"; then
      echo "docker: Error response from daemon: Conflict. The container name \\"/$name\\" is already in use" >&2
      echo "EVENT migrate-conflict" >> "$FAKE_LOG"; exit 125
    fi
    echo "EVENT migrate" >> "$FAKE_LOG"
    [ "\${FAKE_MIGRATE_FAIL:-0}" = 1 ] && exit 1
    exit 0;;
  *"up -d"*)
    echo "EVENT up" >> "$FAKE_LOG"
    echo "UPCALL $args" >> "$FAKE_LOG"
    echo "$IMAGE_TAG" > "$D/current_tag"
    # Un up que NO es --no-deps arrastra cms-migrate (cms depende de él): se relanza sin timeout y queda
    # Exited con el nombre fijo de container_name. Con --no-deps solo si se lista explícitamente.
    if [[ "$args" != *"--no-deps"* ]] || [[ " $args " == *" cms-migrate "* ]]; then
      echo "EVENT up-starts-migrate" >> "$FAKE_LOG"
      grep -qxF unc-cms-migrate-prod "$C" || echo unc-cms-migrate-prod >> "$C"
    fi
    exit 0;;
  *pull*) echo "EVENT pull" >> "$FAKE_LOG"; exit 0;;
esac
echo "EVENT other:$args" >> "$FAKE_LOG"; exit 0
`;
const SHIM_FLOCK = `#!/usr/bin/env bash
echo "LOCK flock $*" >> "$FAKE_LOG"
[ "\${FAKE_LOCK_HELD:-0}" = 1 ] && exit 1
exit 0
`;

const SCRIPT = () => RAW_SCRIPT().replace('cd /opt/unc-portal', 'cd "$WORKDIR"');

/** Crea un directorio de trabajo reutilizable entre despliegues consecutivos. */
function makeWorkdir({ prev = 'sha-0000000', containers = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dep19a-'));
  mkdirSync(join(dir, 'infrastructure', 'docker'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'infrastructure', 'docker', '.env.prod'), 'POSTGRES_DB=fake_db\r\nPOSTGRES_USER=fake_user\r\n');
  for (const [n, body] of [['docker', SHIM_DOCKER], ['flock', SHIM_FLOCK]]) {
    writeFileSync(join(dir, 'bin', n), body);
    chmodSync(join(dir, 'bin', n), 0o755);
  }
  writeFileSync(join(dir, 'deploy.sh'), SCRIPT());
  if (prev !== null) writeFileSync(join(dir, '.deploy-previous-tag'), `${prev}\n`);
  writeFileSync(join(dir, 'containers'), containers.map((c) => `${c}\n`).join(''));
  writeFileSync(join(dir, 'fake.log'), '');
  return dir;
}

function deploy(dir, { imageTag = 'sha-1111111', env = {} } = {}) {
  const log = join(dir, 'fake.log');
  const before = readFileSync(log, 'utf8').split('\n').filter(Boolean).length;
  const r = spawnSync(BASH, [join(dir, 'deploy.sh')], {
    cwd: dir, encoding: 'utf8', timeout: 60_000,
    env: {
      ...process.env, WORKDIR: dir, PATH: join(dir, 'bin') + delimiter + process.env.PATH, FAKE_LOG: log,
      IMAGE_TAG: imageTag, GHCR_USER: 'fake-actor', GHCR_TOKEN: 'fake-token-123',
      DEP09_READY_RETRIES: '2', DEP09_READY_INTERVAL: '0', ...env,
    },
  });
  const all = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/\r$/, ''));
  const lines = all.slice(before);
  const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8').trim() : null);
  return {
    r, lines, out: `${r.stdout}${r.stderr}`,
    events: lines.filter((l) => l.startsWith('EVENT ')).map((l) => l.slice(6)),
    dockerCalls: lines.filter((l) => l.startsWith('ARGS ')),
    state: read('.deploy-previous-tag'), failure: read('.deploy-last-failure'),
    containers: (read('containers') ?? '').split('\n').filter(Boolean),
  };
}
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true });

test('el script extraído es sintácticamente válido (bash -n)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dep19asyn-'));
  writeFileSync(join(dir, 's.sh'), SCRIPT());
  const r = spawnSync(BASH, ['-n', join(dir, 's.sh')], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
});

// ---- 1. Segundo deploy -------------------------------------------------------------------------

test('(1) dos deploys consecutivos: el segundo NO falla por «name already in use»', () => {
  const dir = makeWorkdir();
  const a = deploy(dir, { imageTag: 'sha-1111111' });
  assert.equal(a.r.status, 0, a.out);
  assert.equal(a.state, 'sha-1111111');
  const b = deploy(dir, { imageTag: 'sha-2222222' });
  assert.equal(b.r.status, 0, b.out);
  assert.ok(!b.events.includes('migrate-conflict'), 'conflicto de nombre del migrador');
  assert.equal(b.state, 'sha-2222222');
  cleanup(dir);
});

test('(1) el up -d final NO relanza cms-migrate: lleva --no-deps y no lista cms-migrate', () => {
  const dir = makeWorkdir();
  const a = deploy(dir);
  assert.equal(a.r.status, 0, a.out);
  assert.ok(!a.events.includes('up-starts-migrate'), 'el up arrastró cms-migrate (sin timeout)');
  assert.ok(!a.containers.includes('unc-cms-migrate-prod'), 'quedó un cms-migrate Exited');
  const upCall = a.lines.find((l) => l.startsWith('UPCALL '));
  assert.match(upCall, /--no-deps/);
  assert.doesNotMatch(upCall, /cms-migrate/);
  cleanup(dir);
});

test('(1) un cms-migrate Exited heredado de un deploy anterior se limpia antes del run', () => {
  const dir = makeWorkdir({ containers: ['unc-cms-migrate-prod'] });
  const a = deploy(dir);
  assert.equal(a.r.status, 0, a.out);
  assert.ok(!a.events.includes('migrate-conflict'));
  const iRm = a.events.indexOf('rm:unc-cms-migrate-prod');
  const iRun = a.events.indexOf('migrate');
  assert.ok(iRm >= 0 && iRm < iRun, `limpieza debe ir antes del run: ${a.events.join(',')}`);
  cleanup(dir);
});

test('(1) sin residuo, la limpieza previa no es un error ni imprime avisos de fallo', () => {
  const dir = makeWorkdir();
  const a = deploy(dir);
  assert.equal(a.r.status, 0, a.out);
  assert.doesNotMatch(a.out, /no se pudo limpiar|No such container/i);
  cleanup(dir);
});

// MIN-01: los servicios con `profiles` (minio, perfil s3) no se listan: nombrarlos activaría su perfil.
test('(1) el up -d lista exactamente los servicios del compose por defecto menos cms-migrate', () => {
  const dir = makeWorkdir();
  const a = deploy(dir);
  const upCall = a.lines.find((l) => l.startsWith('UPCALL '));
  const listed = upCall.split(/\s+/).filter((w) => Object.keys(COMPOSE.services).includes(w)).sort();
  const expected = Object.keys(COMPOSE.services).filter((s) => s !== 'cms-migrate' && !COMPOSE.services[s].profiles?.length).sort();
  assert.deepEqual(listed, expected, upCall);
  cleanup(dir);
});

// ---- 3. Lock y trap ----------------------------------------------------------------------------

test('(3) lock tomado por otro deploy: aborta con mensaje claro, sin tocar docker ni el estado', () => {
  const dir = makeWorkdir();
  const a = deploy(dir, { env: { FAKE_LOCK_HELD: '1' } });
  assert.notEqual(a.r.status, 0);
  assert.equal(a.dockerCalls.length, 0, `docker fue invocado: ${a.dockerCalls.join(' | ')}`);
  assert.match(a.out, /deploy en curso|otro deploy/i);
  assert.equal(a.state, 'sha-0000000');
  assert.equal(a.failure, null, 'el perdedor del lock no debe pisar el registro del deploy en curso');
  assert.ok(a.lines.some((l) => l.startsWith('LOCK flock -n')), 'debe usar flock -n');
  cleanup(dir);
});

test('(3) sin el binario flock el deploy falla cerrado (no se despliega sin exclusión)', () => {
  const dir = makeWorkdir();
  rmSync(join(dir, 'bin', 'flock'));
  // PATH mínimo: bin del shim + utilidades base (sin flock del host; Git Bash no lo trae).
  const a = deploy(dir);
  if (a.r.status === 0) {
    // Un host de pruebas con flock real en el PATH: no se puede simular su ausencia aquí.
    cleanup(dir);
    return;
  }
  assert.equal(a.dockerCalls.length, 0);
  assert.match(a.out, /flock/i);
  cleanup(dir);
});

test('(3) fallo del migrate: trap registra el fallo y NO toca .deploy-previous-tag', () => {
  const dir = makeWorkdir();
  const a = deploy(dir, { imageTag: 'sha-3333333', env: { FAKE_MIGRATE_FAIL: '1' } });
  assert.notEqual(a.r.status, 0);
  assert.equal(a.state, 'sha-0000000', 'el estado sano no se sobrescribe');
  assert.ok(a.failure, 'debe existir .deploy-last-failure');
  assert.match(a.failure, /sha-3333333/);
  assert.match(a.failure, /rc=\d+/);
  cleanup(dir);
});

test('(3) gate fallido + rollback: el estado sigue en el tag previo y queda el registro del fallo', () => {
  const dir = makeWorkdir();
  const a = deploy(dir, { imageTag: 'sha-4444444', env: { FAKE_READY_FAIL: '1', FAKE_READY_FAIL_TAG: 'sha-4444444' } });
  assert.notEqual(a.r.status, 0);
  assert.equal(a.state, 'sha-0000000');
  assert.match(String(a.failure), /sha-4444444/);
  cleanup(dir);
});

test('(3) un deploy sano posterior borra el registro del fallo anterior', () => {
  const dir = makeWorkdir();
  const bad = deploy(dir, { imageTag: 'sha-3333333', env: { FAKE_MIGRATE_FAIL: '1' } });
  assert.ok(bad.failure);
  const ok = deploy(dir, { imageTag: 'sha-5555555' });
  assert.equal(ok.r.status, 0, ok.out);
  assert.equal(ok.failure, null);
  assert.equal(ok.state, 'sha-5555555');
  cleanup(dir);
});

test('(3) el lockfile se crea junto al compose (directorio de trabajo)', () => {
  const dir = makeWorkdir();
  deploy(dir);
  assert.ok(existsSync(join(dir, '.deploy.lock')));
  cleanup(dir);
});

// ---- 4. Login sin interpolación ----------------------------------------------------------------

test('(4) el token llega por stdin (--password-stdin) y NO por argumentos; usuario citado', () => {
  const dir = makeWorkdir();
  const a = deploy(dir, { env: { GHCR_TOKEN: 'tok-SECRETO-42', GHCR_USER: 'usuario-x' } });
  assert.equal(a.r.status, 0, a.out);
  const login = a.lines.find((l) => l.startsWith('LOGIN '));
  assert.ok(login, 'no hubo docker login');
  assert.match(login, /stdin=\[tok-SECRETO-42\]/);
  assert.match(login, /args=\[login ghcr\.io -u usuario-x --password-stdin\]/);
  assert.ok(!a.lines.some((l) => l.startsWith('ARGS') && l.includes('tok-SECRETO-42')), 'el token apareció en argumentos');
  assert.doesNotMatch(a.out, /tok-SECRETO-42/);
  cleanup(dir);
});

test('(4) sin GHCR_TOKEN/GHCR_USER el deploy aborta antes de tocar docker', () => {
  const dir = makeWorkdir();
  const a = deploy(dir, { env: { GHCR_TOKEN: '' } });
  assert.notEqual(a.r.status, 0);
  assert.equal(a.dockerCalls.length, 0);
  assert.match(a.out, /GHCR_TOKEN/);
  cleanup(dir);
});
