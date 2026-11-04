// scripts/migrate-gender-age.js
//
// Migra los valores históricos de `gender` y `age` de texto español a IDs neutros.
//   gender: Mujer→female · Hombre→male · No binario→nonbinary · Prefiero no decirlo→undisclosed
//   age:    solo 'Prefiero no decirlo' → undisclosed (los rangos numéricos no cambian)
//
// Colecciones afectadas: footprintresults y participants (ambas guardan gender/age).
//
// Propiedades:
//   --dry-run : no escribe nada; solo cuenta cuántos documentos cambiaría por cada valor.
//   idempotente: solo actúa sobre los valores antiguos; si ya están migrados, no hace nada.
//   seguro: cualquier valor que no esté en la tabla de conversión se deja intacto y se lista al final.
//   sin credenciales en el código: la conexión se lee de process.env (MONGODB_URI / MONGODB_URL).
//
// Uso:
//   1) Prueba:  node scripts/migrate-gender-age.js --dry-run
//   2) Real:    node scripts/migrate-gender-age.js
//      (idempotente: puedes volver a lanzarla sin romper nada)

import 'dotenv/config'
import mongoose from 'mongoose'

const DRY_RUN = process.argv.includes('--dry-run')

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL
if (!MONGODB_URI) {
  console.error('✗ Falta la variable de entorno MONGODB_URI (o MONGODB_URL).')
  process.exit(1)
}

// ── Tablas de conversión (valor antiguo → ID neutro nuevo) ──────────────────────
const GENDER_MAP = {
  'Mujer':               'female',
  'Hombre':              'male',
  'No binario':          'nonbinary',
  'Prefiero no decirlo': 'undisclosed',
}
const AGE_MAP = {
  'Prefiero no decirlo': 'undisclosed',
}

// Valores que ya son válidos (nuevos IDs + vacío + rangos de edad neutros).
const GENDER_VALID_NEW = new Set(['', 'female', 'male', 'nonbinary', 'undisclosed'])
const AGE_VALID_NEW     = new Set(['', '< 20', '20-29', '30-39', '40-49', '50-59', '60+', 'undisclosed'])

// Colección + campo + tabla + conjunto de valores ya-válidos a migrar.
const TARGETS = [
  { collection: 'footprintresults', field: 'gender', map: GENDER_MAP, validNew: GENDER_VALID_NEW },
  { collection: 'footprintresults', field: 'age',    map: AGE_MAP,    validNew: AGE_VALID_NEW },
  { collection: 'participants',     field: 'gender', map: GENDER_MAP, validNew: GENDER_VALID_NEW },
  { collection: 'participants',     field: 'age',    map: AGE_MAP,    validNew: AGE_VALID_NEW },
]

await mongoose.connect(MONGODB_URI)
console.log(`Conectado a MongoDB${DRY_RUN ? '  [modo prueba --dry-run: no se escribe nada]' : ''}`)
console.log('')

const unknownReport = []   // { collection, field, value, count }
let totalChanged = 0

for (const { collection, field, map, validNew } of TARGETS) {
  const coll = mongoose.connection.collection(collection)
  console.log(`▸ ${collection}.${field}`)

  // Migrar cada valor antiguo conocido.
  for (const [oldValue, newValue] of Object.entries(map)) {
    const filter = { [field]: oldValue }
    const count  = await coll.countDocuments(filter)
    if (count === 0) continue

    if (DRY_RUN) {
      console.log(`   cambiaría ${count}×  "${oldValue}" → "${newValue}"`)
    } else {
      const res = await coll.updateMany(filter, { $set: { [field]: newValue } })
      console.log(`   actualizados ${res.modifiedCount}×  "${oldValue}" → "${newValue}"`)
    }
    totalChanged += count
  }

  // Detectar valores desconocidos (ni válidos nuevos ni mapeados): no se tocan.
  const distinct = await coll.distinct(field)
  for (const value of distinct) {
    const v = value == null ? '' : String(value)
    if (validNew.has(v)) continue            // ya migrado / neutro
    if (map[v] != null) continue             // es un valor antiguo conocido (ya contado arriba)
    const count = await coll.countDocuments({ [field]: value })
    unknownReport.push({ collection, field, value: v, count })
  }
  console.log('')
}

console.log('─'.repeat(50))
console.log(DRY_RUN
  ? `Resumen (prueba): ${totalChanged} documento(s) se cambiarían. No se ha escrito nada.`
  : `Resumen: ${totalChanged} documento(s) procesados.`)

if (unknownReport.length) {
  console.log('')
  console.log('⚠ Valores NO reconocidos (no se han tocado) — revísalos a mano:')
  for (const u of unknownReport) {
    console.log(`   ${u.collection}.${u.field}: "${u.value}"  (${u.count} doc)`)
  }
} else {
  console.log('Sin valores desconocidos pendientes.')
}

await mongoose.disconnect()
process.exit(0)
