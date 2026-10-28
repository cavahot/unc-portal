// BACKUP-MEDIA-01 — Utilidades compartidas por las pruebas de respaldo de media / copia externa.
// Qué hace: crea un directorio temporal con shims (docker, rsync, rclone, ssh) en un PATH aislado y ejecuta
//   los scripts reales de scripts/backup/ con bash. gpg y tar son los REALES del equipo (si faltan, las
//   pruebas que los necesitan se omiten).
// Por qué: probar el cifrado con un gpg falso no demostraría nada; en cambio docker/rsync/rclone/ssh no se
//   pueden ejecutar contra servidores reales en una prueba unitaria. Límite: no se ejercita Docker ni red.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
export const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');
export const SCRIPTS = resolve(ROOT, 'scripts', 'backup');
export const PASS = 'frase-de-paso-de-prueba-0123456789'; // sintética, >= 20 caracteres
export const hasGpg = spawnSync(BASH, ['-c', 'gpg --version'], {}).status === 0;

// Shim de docker: `inspect` responde según FAKE_NO_CONTAINER; `exec <c> tar` empaqueta FAKE_MEDIA_DIR de verdad;
// `exec <c> pg_dump` emite un volcado sintético con la firma PGDMP; FAKE_TAR_FAIL simula un tar que falla a medias.
const DOCKER = `#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_LOG"
case "$*" in
  "inspect -f {{.State.Running}}"*) [ "\${FAKE_NO_CONTAINER:-0}" = 1 ] && exit 1; [ "\${FAKE_CMS_RUNNING:-1}" = 1 ] && echo true || echo false; exit 0;;
  "inspect -f {{.Config.Image}}"*) [ "\${FAKE_NO_CONTAINER:-0}" = 1 ] && exit 1; echo "\${FAKE_CMS_IMAGE:-cms-img:test}"; exit 0;;
  "image inspect "*) for i in \${FAKE_LOCAL_IMAGES-cms-img:test}; do [ "image inspect $i" = "$*" ] && exit 0; done; exit 1;;
  "volume inspect"*) [ "\${FAKE_NO_VOLUME:-0}" = 1 ] && exit 1; exit 0;;
  "run --rm"*) case "$*" in *":/app/media:ro"*) ;; *) echo "run sin :ro" >> "$FAKE_LOG"; exit 9;; esac
     [ "\${FAKE_TAR_FAIL:-0}" = 1 ] && { printf partial; exit 1; }
     exec tar -czf - -C "$FAKE_MEDIA_DIR" .;;
  "inspect"*) [ "\${FAKE_NO_CONTAINER:-0}" = 1 ] && exit 1; exit 0;;
  *" tar -xzf"*) mkdir -p "$FAKE_RESTORE_DIR"; echo "EVENT extract" >> "$FAKE_LOG"; exec tar -xzf - -C "$FAKE_RESTORE_DIR";;
  *" chown "*) echo "EVENT chown" >> "$FAKE_LOG"; exit 0;;
  *" tar "*) [ "\${FAKE_TAR_FAIL:-0}" = 1 ] && { printf 'partial' ; exit 1; }
     exec tar -czf - -C "$FAKE_MEDIA_DIR" .;;
  *pg_dump*) [ "\${FAKE_PGDUMP_FAIL:-0}" = 1 ] && exit 1; printf 'PGDMP-SINTETICO-0123456789'; exit 0;;
esac
exit 0
`;
// Shims de red: registran los argumentos (y la lista de archivos) y fallan si FAKE_<X>_FAIL=1.
const NET = (name, flag) => `#!/usr/bin/env bash
echo "${name} $*" >> "$FAKE_LOG"
[ "\${${flag}:-0}" = 1 ] && { echo "connection refused" >&2; exit 1; }
exit 0
`;

export function makeEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'bkpm-'));
  const bin = join(dir, 'bin');
  const media = join(dir, 'media-src');
  const local = join(dir, 'backups');
  mkdirSync(bin); mkdirSync(media);
  writeFileSync(join(media, 'foto1.jpg'), 'JPEGDATA-1');
  writeFileSync(join(media, 'foto2.png'), 'PNGDATA-2');
  const log = join(dir, 'fake.log');
  writeFileSync(log, '');
  const shims = { docker: DOCKER, rsync: NET('rsync', 'FAKE_RSYNC_FAIL'), rclone: NET('rclone', 'FAKE_RCLONE_FAIL'), ssh: NET('ssh', 'FAKE_SSH_FAIL') };
  const install = (names) => {
    for (const n of names) { writeFileSync(join(bin, n), shims[n]); chmodSync(join(bin, n), 0o755); }
  };
  install(['docker', 'rsync', 'rclone', 'ssh']);
  const baseEnv = () => {
    const e = { ...process.env, PATH: bin + delimiter + process.env.PATH, FAKE_LOG: log, FAKE_MEDIA_DIR: media, FAKE_RESTORE_DIR: join(dir, 'restored').split('\\').join('/'),
      BACKUP_LOCAL_DIR: local, BACKUP_SSH_BIN: join(bin, 'ssh').split('\\').join('/'), BACKUP_ENV_FILE: join(dir, 'no-existe.env'), PROD_ENV_FILE: join(dir, 'no-existe-prod.env') };
    for (const k of ['BACKUP_ENCRYPTION_PASSPHRASE', 'BACKUP_REMOTE', 'BACKUP_SSH_KEY', 'BACKUP_RETENTION_DAYS', 'CMS_CONTAINER']) delete e[k];
    return e;
  };
  const run = (script, args = [], env = {}, input) => {
    const r = spawnSync(BASH, [join(SCRIPTS, script), ...args], { cwd: dir, env: { ...baseEnv(), ...env }, encoding: 'utf8', input, timeout: 120_000 });
    return { status: r.status, out: `${r.stdout}${r.stderr}`, stdout: r.stdout };
  };
  return {
    dir, bin, media, local, log, run, install,
    removeShim: (n) => rmSync(join(bin, n), { force: true }),
    logText: () => readFileSync(log, 'utf8'),
    files: () => (existsSync(local) ? readdirSync(local) : []),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
