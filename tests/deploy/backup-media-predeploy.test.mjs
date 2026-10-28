// BACKUP-MEDIA-01 (B) — El deploy respalda (cifrado) el volumen de media ANTES de migrar/levantar.
// Qué hace: extrae el script SSH real de deploy.yml («Pull images and restart services») y lo ejecuta con un
//   shim de docker (gpg y tar reales) comprobando orden, fail-closed y omisión en el primer deploy.
// Por qué: antes solo se hacía pg_dump; si el deploy o su rollback dañaban el volumen, las filas `media`
//   quedaban sin archivo y no había copia. Amenaza: pérdida de las imágenes subidas. Límite: no corre Docker real;
//   el rollback de imagen sigue sin restaurar media (se restaura a mano, ver docs/BACKUP_RECOVERY.md).
// Spec: docs/specs/backup/BACKUP-MEDIA-01.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync, readdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW = readFileSync(resolve(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');
const PASS = 'frase-de-paso-de-prueba-0123456789';
const hasGpg = spawnSync(BASH, ['-c', 'gpg --version']).status === 0;

function extractScript(workflow, stepName) {
  const start = workflow.indexOf(`- name: ${stepName}`);
  assert.ok(start >= 0, `paso «${stepName}» no encontrado`);
  const m = workflow.slice(start).match(/script: \|\n((?: {12}.*\n|\n)+)/);
  assert.ok(m, 'bloque script no encontrado');
  return m[1].split('\n').map((l) => l.replace(/^ {12}/, '')).join('\n');
}
const SCRIPT = extractScript(WORKFLOW, 'Pull images and restart services').replace('cd /opt/unc-portal', 'cd "$WORKDIR"');

const SHIM = `#!/usr/bin/env bash
args="$*"
D="$(dirname "$FAKE_LOG")"
echo "ARGS $args" >> "$FAKE_LOG"
case "$args" in
  "exec unc-cms-prod wget"*"/api/aranceles-rectorado"*) printf '{"docs":[],"totalDocs":0}'; exit 0;;
  "exec unc-cms-prod wget"*|"exec unc-portal-prod wget"*) exit 0;;
  "exec unc-cms-prod tar"*)
    echo "EVENT media-tar" >> "$FAKE_LOG"
    [ "\${FAKE_TAR_FAIL:-0}" = 1 ] && { printf partial; exit 1; }
    exec tar -czf - -C "$FAKE_MEDIA_DIR" .;;
  "inspect -f {{.State.Running}} unc-cms-prod"*) [ "\${FAKE_CMS_RUNNING:-1}" = 1 ] && echo true || echo false; exit 0;;
  "inspect -f {{.Config.Image}} unc-cms-prod"*) echo "cms-img:test"; exit 0;;
  "inspect unc-cms-prod"*) [ "\${FAKE_CMS_EXISTS:-1}" = 1 ] && exit 0; exit 1;;
  "image inspect cms-img:test"*) exit 0;;
  "image inspect "*) exit 1;;
  "run --rm"*) echo "EVENT media-run" >> "$FAKE_LOG"; case "$args" in *":/app/media:ro"*) ;; *) exit 9;; esac
     [ "\${FAKE_TAR_FAIL:-0}" = 1 ] && { printf partial; exit 1; }
     exec tar -czf - -C "$FAKE_MEDIA_DIR" .;;
  "volume inspect unc_cms_media_prod"*) [ "\${FAKE_MEDIA_VOLUME:-1}" = 1 ] && exit 0; exit 1;;
  "volume inspect"*) exit 1;;
  "rm -f"*|"ps -aq"*) exit 0;;
  login*) cat > /dev/null; exit 0;;
  ps*) echo other; echo unc-postgres-prod; [ "\${FAKE_CMS_RUNNING:-1}" = 1 ] && echo unc-cms-prod; exit 0;;
  *information_schema*) echo "3"; exit 0;;
  *to_regclass*) echo "t"; exit 0;;
  *"batch = -1"*) echo "0"; exit 0;;
  *"batch > 0"*) echo "1"; exit 0;;
  *"pg_restore --list"*) cat > /dev/null; exit 0;;
  *pg_dump*) echo "EVENT pg_dump" >> "$FAKE_LOG"; printf 'PGDMP-SYNTHETIC'; exit 0;;
  *"run --rm"*cms-migrate*) echo "EVENT migrate" >> "$FAKE_LOG"; exit 0;;
  *"up -d"*) echo "EVENT up" >> "$FAKE_LOG"; echo "$IMAGE_TAG" > "$D/current_tag"; exit 0;;
  *pull*) exit 0;;
esac
exit 0
`;

function run(env = {}, { passFile = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'bmpd-'));
  mkdirSync(join(dir, 'infrastructure', 'docker'), { recursive: true });
  mkdirSync(join(dir, 'bin')); mkdirSync(join(dir, 'media-src'));
  writeFileSync(join(dir, 'media-src', 'foto.jpg'), 'JPEGDATA');
  writeFileSync(join(dir, 'infrastructure', 'docker', '.env.prod'), 'POSTGRES_DB=fake_db\nPOSTGRES_USER=fake_user\n');
  cpSync(resolve(ROOT, 'scripts', 'backup'), join(dir, 'scripts', 'backup'), { recursive: true });
  if (passFile) writeFileSync(join(dir, '.env.backup'), `BACKUP_ENCRYPTION_PASSPHRASE=${PASS}\n`);
  for (const [n, body] of [['docker', SHIM], ['flock', '#!/usr/bin/env bash\nexit 0\n']]) {
    writeFileSync(join(dir, 'bin', n), body); chmodSync(join(dir, 'bin', n), 0o755);
  }
  writeFileSync(join(dir, 'deploy.sh'), SCRIPT);
  writeFileSync(join(dir, '.deploy-previous-tag'), 'sha-0000000\n');
  const log = join(dir, 'fake.log'); writeFileSync(log, '');
  const r = spawnSync(BASH, [join(dir, 'deploy.sh')], {
    cwd: dir, encoding: 'utf8', timeout: 120_000,
    env: { ...process.env, WORKDIR: dir, PATH: join(dir, 'bin') + delimiter + process.env.PATH, FAKE_LOG: log, FAKE_MEDIA_DIR: join(dir, 'media-src'),
      GHCR_USER: 'u', GHCR_TOKEN: 't', IMAGE_TAG: 'sha-1111111', DEP09_READY_RETRIES: '2', DEP09_READY_INTERVAL: '0', ...env },
  });
  const events = readFileSync(log, 'utf8').split('\n').filter((l) => l.startsWith('EVENT ')).map((l) => l.slice(6).trim());
  const bdir = join(dir, 'backups');
  return { r, events, out: `${r.stdout}${r.stderr}`, gpg: existsSync(bdir) ? readdirSync(bdir).filter((f) => f.startsWith('media-') && f.endsWith('.gpg')) : [], cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
const opts = { skip: !hasGpg };

test('(1) el copiado al servidor incluye scripts/backup y el script de deploy llama a backup-media.sh', () => {
  assert.match(WORKFLOW, /source:\s+"infrastructure\/,scripts\/backup\/"/);
  assert.match(SCRIPT, /scripts\/backup\/backup-media\.sh/);
});

test('(2) media cifrada DESPUÉS del pg_dump y ANTES de migrate/up; queda un .gpg', opts, () => {
  const t = run();
  assert.equal(t.r.status, 0, t.out);
  const i = (e) => t.events.indexOf(e);
  assert.ok(i('pg_dump') >= 0 && i('media-tar') > i('pg_dump'), t.events.join(','));
  assert.ok(i('migrate') > i('media-tar') && i('up') > i('media-tar'));
  assert.equal(t.gpg.length, 1);
  assert.ok(!t.out.includes(PASS));
  t.cleanup();
});

test('(3) si el respaldo de media falla: el deploy ABORTA sin migrar ni levantar', opts, () => {
  const t = run({ FAKE_TAR_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.match(t.out, /media/i);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  assert.equal(t.gpg.length, 0);
  t.cleanup();
});

test('(4) primer deploy (sin volumen de media): se omite con mensaje y el deploy sigue', opts, () => {
  const t = run({ FAKE_MEDIA_VOLUME: '0', FAKE_CMS_EXISTS: '0', FAKE_CMS_RUNNING: '0' });
  assert.equal(t.r.status, 0, t.out);
  assert.match(t.out, /sin volumen de media|primer deploy/i);
  assert.ok(!t.events.includes('media-tar'));
  assert.ok(t.events.includes('up'));
  t.cleanup();
});

test('(5) volumen presente y CMS caído: NO aborta; respalda en modo volumen (:ro) y el deploy sigue', opts, () => {
  const t = run({ FAKE_CMS_RUNNING: '0' });
  assert.equal(t.r.status, 0, t.out);
  assert.ok(t.events.includes('media-run') && !t.events.includes('media-tar'), t.events.join(','));
  assert.ok(t.events.indexOf('migrate') > t.events.indexOf('media-run'));
  assert.ok(t.events.includes('up'));
  assert.equal(t.gpg.length, 1);
  t.cleanup();
});

test('(5b) CMS caído y el respaldo en modo volumen falla: el deploy ABORTA sin migrar ni levantar', opts, () => {
  const t = run({ FAKE_CMS_RUNNING: '0', FAKE_TAR_FAIL: '1' });
  assert.notEqual(t.r.status, 0);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  assert.equal(t.gpg.length, 0);
  t.cleanup();
});

test('(6) sin frase de paso (.env.backup ausente): aborta antes de migrar y nombra la variable', opts, () => {
  const t = run({}, { passFile: false });
  assert.notEqual(t.r.status, 0);
  assert.match(t.out, /BACKUP_ENCRYPTION_PASSPHRASE/);
  assert.ok(!t.events.includes('migrate') && !t.events.includes('up'));
  t.cleanup();
});
