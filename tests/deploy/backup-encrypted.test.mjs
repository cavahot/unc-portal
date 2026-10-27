// BKP-01 — La copia diaria de la BD no puede salir del runner en claro.
// Qué hace: (1) ejecuta scripts/backup/encrypt-dump.sh con gpg real (frase de paso solo por entorno/stdin) y
//   comprueba validación fail-closed, cifrado ida y vuelta, sha256, borrado del texto plano también ante
//   fallo y que el valor del secreto no aparece en la salida; (2) afirma estáticamente sobre el YAML de
//   .github/workflows/backup.yml que solo se sube el .gpg + su sha256, que el secreto se valida ANTES del
//   volcado y que hay limpieza `if: always()`.
// Por qué: el repositorio es PÚBLICO y un artefacto de Actions con el .dump (usuarios, hashes, PII) puede
//   ser descargable por terceros con permiso de lectura (MIG-IMG §16.5). Amenaza que evita: exposición del
//   volcado. Límite: no ejecuta GitHub Actions ni pg_dump; no prueba la custodia de la frase de paso ni
//   que el secreto exista en el repositorio. gpg simétrico protege tanto como la frase de paso.
// Spec: docs/BACKUP_RECOVERY.md (sección «Copia diaria cifrada») | Tarea: BKP-01
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GIT_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH = process.env.BASH_BIN || (existsSync(GIT_BASH) ? GIT_BASH : 'bash');
const SCRIPT = resolve(ROOT, 'scripts', 'backup', 'encrypt-dump.sh');
const WF_TEXT = readFileSync(resolve(ROOT, '.github', 'workflows', 'backup.yml'), 'utf8').replace(/\r\n/g, '\n');
const WF = yaml.load(WF_TEXT);
const STEPS = WF.jobs.database.steps;
const GOOD = 'frase-de-paso-de-prueba-0123456789'; // sintética, >= 20 caracteres
const hasGpg = spawnSync(BASH, ['-c', 'gpg --version'], {}).status === 0;

/** Ejecuta el script bajo bash; la frase de paso se quita del entorno heredado salvo que el caso la fije. */
function sh(args, env, cwd) {
  const base = { ...process.env };
  delete base.BACKUP_ENCRYPTION_PASSPHRASE;
  const r = spawnSync(BASH, [SCRIPT, ...args], { cwd, env: { ...base, ...env }, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}
const work = () => mkdtempSync(join(tmpdir(), 'bkp-'));
const DECRYPT = 'printf %s "$P" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 --decrypt';

// ---- Script: validación fail-closed -----------------------------------------------------------------

test('(1) el script existe y no pasa la frase de paso por la línea de comandos', () => {
  assert.ok(existsSync(SCRIPT), 'falta scripts/backup/encrypt-dump.sh');
  const code = readFileSync(SCRIPT, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.match(code, /--passphrase-fd/);
  assert.doesNotMatch(code, /--passphrase(\s|=)/, 'la frase no debe ir en argv (se vería en la lista de procesos)');
  assert.doesNotMatch(code, /set -x|set -o xtrace/);
});

test('(2) --check falla sin secreto y con secreto corto (19), pasa con 20; no imprime el valor', { skip: !hasGpg }, () => {
  const none = sh(['--check'], {});
  assert.notEqual(none.status, 0);
  assert.match(none.out, /BACKUP_ENCRYPTION_PASSPHRASE/);
  const short = 'a1b2c3d4e5f6g7h8i9j'; // 19
  assert.equal(short.length, 19);
  const s = sh(['--check'], { BACKUP_ENCRYPTION_PASSPHRASE: short });
  assert.notEqual(s.status, 0);
  assert.ok(!s.out.includes(short), 'el mensaje no debe contener el valor');
  const ok = sh(['--check'], { BACKUP_ENCRYPTION_PASSPHRASE: 'a1b2c3d4e5f6g7h8i9j0' });
  assert.equal(ok.status, 0, ok.out);
});

test('(3) con secreto inválido NO cifra y borra el .dump en claro (también ante fallo)', { skip: !hasGpg }, () => {
  const dir = work();
  writeFileSync(join(dir, 'unc_portal_1.dump'), 'PGDMP-contenido');
  const r = sh(['unc_portal_1.dump'], { BACKUP_ENCRYPTION_PASSPHRASE: 'corta' }, dir);
  assert.notEqual(r.status, 0);
  assert.ok(!r.out.includes('corta'));
  assert.ok(!existsSync(join(dir, 'unc_portal_1.dump.gpg')));
  assert.ok(!existsSync(join(dir, 'unc_portal_1.dump')), 'el texto plano debe borrarse incluso ante fallo');
  rmSync(dir, { recursive: true, force: true });
});

test('(4) volcado vacío o inexistente: falla y no produce .gpg', { skip: !hasGpg }, () => {
  const dir = work();
  writeFileSync(join(dir, 'e.dump'), '');
  const r = sh(['e.dump'], { BACKUP_ENCRYPTION_PASSPHRASE: GOOD }, dir);
  assert.notEqual(r.status, 0);
  assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith('.gpg')), []);
  assert.notEqual(sh(['no-existe.dump'], { BACKUP_ENCRYPTION_PASSPHRASE: GOOD }, dir).status, 0);
  rmSync(dir, { recursive: true, force: true });
});

// ---- Script: cifrado ida y vuelta ---------------------------------------------------------------------

test('(5) cifra, escribe sha256 válido, borra el texto plano y descifra al original; el secreto no aparece', { skip: !hasGpg }, () => {
  const dir = work();
  const original = Buffer.from('PGDMP\u0000contenido-sintetico-'.repeat(500));
  writeFileSync(join(dir, 'unc_portal_2.dump'), original);
  const r = sh(['unc_portal_2.dump'], { BACKUP_ENCRYPTION_PASSPHRASE: GOOD }, dir);
  assert.equal(r.status, 0, r.out);
  assert.ok(!r.out.includes(GOOD), 'la salida no debe contener la frase de paso');
  assert.ok(!existsSync(join(dir, 'unc_portal_2.dump')), 'texto plano debe eliminarse');
  const enc = readFileSync(join(dir, 'unc_portal_2.dump.gpg'));
  assert.ok(!enc.includes(Buffer.from('contenido-sintetico')), 'el .gpg no debe contener el texto plano');
  const sum = readFileSync(join(dir, 'unc_portal_2.dump.gpg.sha256'), 'utf8').trim();
  assert.equal(sum, `${createHash('sha256').update(enc).digest('hex')}  unc_portal_2.dump.gpg`);
  assert.match(r.out, /ENCRYPTED_FILE=unc_portal_2\.dump\.gpg/);
  // Descifrado con la frase por stdin (así lo documenta la restauración).
  const d = spawnSync(BASH, ['-c', `${DECRYPT} unc_portal_2.dump.gpg`], { cwd: dir, env: { ...process.env, P: GOOD }, maxBuffer: 1 << 26 });
  assert.equal(d.status, 0, String(d.stderr));
  assert.ok(Buffer.compare(d.stdout, original) === 0, 'el descifrado debe igualar al original');
  // Con otra frase NO descifra.
  const bad = spawnSync(BASH, ['-c', `${DECRYPT} unc_portal_2.dump.gpg`], { cwd: dir, env: { ...process.env, P: `${GOOD}x` } });
  assert.notEqual(bad.status, 0);
  rmSync(dir, { recursive: true, force: true });
});

// ---- Workflow ----------------------------------------------------------------------------------------

const idx = (pred) => STEPS.findIndex(pred);
const runOf = (s) => String(s.run ?? '');

test('(6) el secreto se valida ANTES del pg_dump (fail-closed antes de tocar la BD)', () => {
  const check = idx((s) => /encrypt-dump\.sh\s+--check/.test(runOf(s)));
  const dump = idx((s) => /pg_dump/.test(runOf(s)));
  assert.ok(check >= 0, 'falta el paso de validación --check');
  assert.ok(dump >= 0);
  assert.ok(check < dump, 'la validación debe preceder al volcado');
  assert.match(JSON.stringify(STEPS[check].env ?? {}), /secrets\.BACKUP_ENCRYPTION_PASSPHRASE/);
});

test('(7) el volcado se verifica con pg_restore --list y luego se cifra con el script', () => {
  const dump = idx((s) => /pg_dump/.test(runOf(s)));
  assert.match(runOf(STEPS[dump]), /pg_restore\s+--list/);
  const enc = idx((s) => /encrypt-dump\.sh\s+"\$\{?DUMP_FILE/.test(runOf(s)));
  assert.ok(enc > dump, 'el cifrado va después del volcado');
  assert.match(JSON.stringify(STEPS[enc].env ?? {}), /secrets\.BACKUP_ENCRYPTION_PASSPHRASE/);
});

test('(8) el único artefacto subido es el .gpg y su sha256; nunca el .dump en claro', () => {
  const ups = STEPS.filter((s) => String(s.uses ?? '').startsWith('actions/upload-artifact'));
  assert.equal(ups.length, 1);
  const p = String(ups[0].with.path);
  assert.match(p, /ENCRYPTED_FILE/);
  assert.doesNotMatch(p, /DUMP_FILE/);
  assert.doesNotMatch(p.replace(/ENCRYPTED_FILE/g, ''), /\.dump/);
  assert.equal(ups[0].with['if-no-files-found'], 'error');
  const days = Number(ups[0].with['retention-days']);
  assert.ok(days >= 7 && days <= 30, `retención razonable (7..30 días), es ${days}`);
});

test('(9) hay limpieza del texto plano con if: always() y permisos mínimos (contents: read)', () => {
  const clean = STEPS.find((s) => String(s.if ?? '').includes('always()') && /rm\s+-f/.test(runOf(s)) && /\.dump/.test(runOf(s)));
  assert.ok(clean, 'falta paso de borrado del .dump con if: always()');
  assert.deepEqual(WF.permissions ?? WF.jobs.database.permissions, { contents: 'read' });
});

test('(10) ningún echo imprime secretos y el workflow nombra BACKUP_ENCRYPTION_PASSPHRASE', () => {
  assert.doesNotMatch(WF_TEXT, /echo[^\n]*\$\{\{\s*secrets\./);
  assert.match(WF_TEXT, /BACKUP_ENCRYPTION_PASSPHRASE/);
});
