#!/usr/bin/env node
// Comprueba que es.json y en.json tienen EXACTAMENTE las mismas claves.
// Uso: node scripts/check-i18n.js   (sale con código 1 si hay diferencias)
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'locales')
const es = JSON.parse(fs.readFileSync(path.join(dir, 'es.json'), 'utf8'))
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'))

function flatten(obj, prefix = '') {
  let keys = []
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      keys = keys.concat(flatten(obj[k], full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

const esKeys = new Set(flatten(es))
const enKeys = new Set(flatten(en))

const missingInEn = [...esKeys].filter(k => !enKeys.has(k)).sort()
const missingInEs = [...enKeys].filter(k => !esKeys.has(k)).sort()

console.log(`es.json: ${esKeys.size} claves · en.json: ${enKeys.size} claves`)

if (missingInEn.length === 0 && missingInEs.length === 0) {
  console.log('✓ es.json y en.json tienen exactamente las mismas claves.')
  process.exit(0)
}

if (missingInEn.length) {
  console.error(`\n✗ Faltan en en.json (${missingInEn.length}):`)
  missingInEn.forEach(k => console.error('  -', k))
}
if (missingInEs.length) {
  console.error(`\n✗ Faltan en es.json (${missingInEs.length}):`)
  missingInEs.forEach(k => console.error('  +', k))
}
process.exit(1)
