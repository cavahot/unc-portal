#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const src = path.resolve(__dirname, '../apps/cms/src/payload-types.ts')
const dest = path.resolve(__dirname, '../packages/cms-types/src/payload-types.ts')

let content = fs.readFileSync(src, 'utf8')

// Strip payload module augmentation — not needed in portal package.
// MLG-01: el bloque contiene `{}` anidado (`extends Config {}`), así que `[^}]*` nunca llegaba al cierre y el
// bloque quedaba en packages/cms-types; se busca hasta la llave de cierre en su propia línea al final.
content = content.replace(/\n*declare module 'payload'\s*\{[\s\S]*?\n\}\s*$/, '\n')

fs.writeFileSync(dest, content)
console.log('✓ payload-types.ts synced (augmentation stripped)')
