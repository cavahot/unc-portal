// Endurecimiento del acceso SSH del VPS (tarea: paquete de despliegue / SEC-027).
// Qué hace: comprueba que la guía de instalación y la lista de verificación exijan los controles del puerto 22.
// Amenazas: fuerza bruta de contraseñas contra SSH, login directo de root, bloqueo del administrador por una
//   configuración que no se probó, y un archivo de configuración que otro (cloud-init) vuelve a abrir.
// Límite: análisis estático de documentos; no ejecuta sshd. La verificación real es `sshd -T` en el servidor.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const GUIA = read('docs/deploy/INSTALACION.md')
const LISTA = read('docs/deploy/CHECKLIST-PUBLICACION.md')

test('(1) la guía tiene una sección de acceso SSH con las directivas clave', () => {
  assert.match(GUIA, /Proteger el acceso SSH/)
  assert.match(GUIA, /PasswordAuthentication no/)
  assert.match(GUIA, /PermitRootLogin no/)
})

test('(2) usa un archivo que se lee ANTES de 50-cloud-init.conf (el primer valor gana)', () => {
  assert.match(GUIA, /sshd_config\.d\/00-/)
  assert.match(GUIA, /50-cloud-init/)
})

test('(3) exige probar la clave y validar la configuración antes de cerrar la sesión', () => {
  assert.match(GUIA, /sshd -t/)
  assert.match(GUIA, /otra (ventana|terminal|sesión)/i)
})

test('(4) incluye límite de intentos (ufw limit) y fail2ban', () => {
  assert.match(GUIA, /ufw limit/)
  assert.match(GUIA, /fail2ban/)
  assert.match(GUIA, /fail2ban-client status sshd/)
})

test('(5) explica el cambio de puerto: opcional, orden seguro y SSH_PORT', () => {
  assert.match(GUIA, /cambiar el puerto/i)
  assert.match(GUIA, /SSH_PORT/)
  assert.match(GUIA, /no (es|reemplaza)[^.]*defensa|no sustituye/i)
})

test('(6) la lista de verificación exige comprobar el acceso SSH', () => {
  assert.match(LISTA, /PasswordAuthentication/)
  assert.match(LISTA, /fail2ban/)
  assert.match(LISTA, /sshd -T/)
})
