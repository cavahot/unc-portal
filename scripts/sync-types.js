#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const src = path.resolve(__dirname, '../apps/cms/src/payload-types.ts')
const dest = path.resolve(__dirname, '../packages/cms-types/src/payload-types.ts')

let content = fs.readFileSync(src, 'utf8')

// Strip payload module augmentation — not needed in portal package
content = content.replace(/\n?declare module 'payload'\s*\{[^}]*\}\s*$/, '')

fs.writeFileSync(dest, content)
console.log('✓ payload-types.ts synced (augmentation stripped)')
