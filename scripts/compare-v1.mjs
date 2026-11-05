// Compara la rama actual con el tag v1-es (versión pre-i18n).
// Comprueba: answerLabels (IDs/values/orden/etiquetas), las 38 acciones
// (id/area/co2Reduction/imagen/título/descripción) y que calculator.js dé
// resultados idénticos para dos perfiles. No corrige nada: solo informa.
//
// Uso: node scripts/compare-v1.mjs   (exit 1 si hay cualquier diferencia)

import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const tmp = mkdtempSync(join(tmpdir(), 'cmpv1-'))
const diffs = []
const fail = (msg) => diffs.push(msg)

// Extrae un fichero del tag v1-es a un .mjs temporal y lo importa.
async function importFromV1(repoPath) {
  const src = execSync(`git show v1-es:${repoPath}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const f = join(tmp, repoPath.replace(/[\/]/g, '_'))
  writeFileSync(f, src)
  return import(pathToFileURL(f).href)
}
async function importCurrent(relPath) {
  return import(pathToFileURL(join(ROOT, relPath)).href)
}
function get(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

const es = JSON.parse(readFileSync(join(ROOT, 'frontend/src/i18n/locales/es.json'), 'utf8'))

// ── 1. answerLabels ────────────────────────────────────────────────────────────
{
  const v1 = (await importFromV1('frontend/src/utils/answerLabels.js')).AREA_QUESTIONS
  const cur = (await importCurrent('frontend/src/utils/answerLabels.js')).AREA_QUESTIONS

  if (v1.length !== cur.length) fail(`answerLabels: nº de áreas v1=${v1.length} actual=${cur.length}`)
  for (let i = 0; i < Math.max(v1.length, cur.length); i++) {
    const a1 = v1[i], ac = cur[i]
    if (!a1 || !ac) { fail(`answerLabels: área en posición ${i} falta en una versión`); continue }
    if (a1.areaId !== ac.areaId) fail(`área[${i}]: areaId v1=${a1.areaId} actual=${ac.areaId}`)
    // areaLabel: v1 es texto; actual es clave → resolver en es.json
    const curAreaLabel = get(es, ac.areaLabel)
    if (curAreaLabel !== a1.areaLabel) fail(`área ${a1.areaId}: areaLabel v1="${a1.areaLabel}" es.json="${curAreaLabel}"`)

    if ((a1.questions?.length) !== (ac.questions?.length)) fail(`área ${a1.areaId}: nº preguntas v1=${a1.questions?.length} actual=${ac.questions?.length}`)
    for (let j = 0; j < Math.max(a1.questions.length, ac.questions.length); j++) {
      const q1 = a1.questions[j], qc = ac.questions[j]
      if (!q1 || !qc) { fail(`área ${a1.areaId}: pregunta pos ${j} falta`); continue }
      if (q1.id !== qc.id) fail(`área ${a1.areaId} pregunta[${j}]: id v1=${q1.id} actual=${qc.id} (orden distinto)`)
      if (q1.type !== qc.type) fail(`pregunta ${q1.id}: type v1=${q1.type} actual=${qc.type}`)
      // text / info
      if (get(es, qc.text) !== q1.text) fail(`pregunta ${q1.id}: text v1="${q1.text}" es.json="${get(es, qc.text)}"`)
      if ((q1.info ?? undefined) !== undefined || (qc.info ?? undefined) !== undefined) {
        if (get(es, qc.info) !== q1.info) fail(`pregunta ${q1.id}: info v1="${q1.info}" es.json="${get(es, qc.info)}"`)
      }
      // options
      const o1 = q1.options || [], oc = qc.options || []
      if (o1.length !== oc.length) fail(`pregunta ${q1.id}: nº opciones v1=${o1.length} actual=${oc.length}`)
      for (let k = 0; k < Math.max(o1.length, oc.length); k++) {
        const op1 = o1[k], opc = oc[k]
        if (!op1 || !opc) { fail(`pregunta ${q1.id}: opción pos ${k} falta`); continue }
        if (op1.value !== opc.value) fail(`pregunta ${q1.id} opción[${k}]: value v1=${op1.value} actual=${opc.value} (orden distinto)`)
        if (get(es, opc.label) !== op1.label) fail(`pregunta ${q1.id} opción ${op1.value}: label v1="${op1.label}" es.json="${get(es, opc.label)}"`)
        if (op1.sublabel !== undefined || opc.sublabel !== undefined) {
          if (get(es, opc.sublabel) !== op1.sublabel) fail(`pregunta ${q1.id} opción ${op1.value}: sublabel v1="${op1.sublabel}" es.json="${get(es, opc.sublabel)}"`)
        }
      }
    }
  }
}

// ── 2. Acciones (38) ────────────────────────────────────────────────────────────
{
  const v1 = (await importFromV1('frontend/src/utils/actions.js')).ACTIONS
  const cur = (await importCurrent('frontend/src/utils/actions.js')).ACTIONS
  if (v1.length !== cur.length) fail(`actions: nº acciones v1=${v1.length} actual=${cur.length}`)
  const curById = Object.fromEntries(cur.map(a => [a.id, a]))
  v1.forEach((a1, i) => {
    const ac = cur[i]
    if (!ac) { fail(`actions: acción pos ${i} falta`); return }
    if (a1.id !== ac.id) fail(`actions[${i}]: id v1=${a1.id} actual=${ac.id} (orden distinto)`)
    const c = curById[a1.id]
    if (!c) { fail(`actions: id ${a1.id} no existe en actual`); return }
    if (a1.area !== c.area) fail(`acción ${a1.id}: area v1=${a1.area} actual=${c.area}`)
    if (a1.co2Reduction !== c.co2Reduction) fail(`acción ${a1.id}: co2Reduction v1=${a1.co2Reduction} actual=${c.co2Reduction}`)
    if (a1.image !== c.image) fail(`acción ${a1.id}: image v1=${a1.image} actual=${c.image}`)
    if (get(es, c.title) !== a1.label) fail(`acción ${a1.id}: título v1="${a1.label}" es.json="${get(es, c.title)}"`)
    if (get(es, c.description) !== a1.description) fail(`acción ${a1.id}: descripción v1="${a1.description}" es.json="${get(es, c.description)}"`)
  })
}

// ── 3. calculator.js — dos perfiles ─────────────────────────────────────────────
{
  const v1 = (await importFromV1('frontend/src/utils/calculator.js')).calculator
  const cur = (await importCurrent('frontend/src/utils/calculator.js')).calculator

  const full = {
    carKm: 'km_c', carType: 'gasoline',
    flightShort: 2, flightMedium: 1, flightLong: 1,
    train: '3b', moto: '4b', urbanMobility: '5e', telework: 'partial',
    homeType: '25b', heating: '26c', renewable: 'c', hasAC: 'yes', pool: 'communityPool',
    homeHabits: ['closeWindows', 'ledBulbs'],
    hotelNights: 5, hostelNights: 2, campingNights: 3, airbnbNights: 4, secondHome: true,
    breakfastDays: { '6a': 3, '6b': 4 }, breakfastDouble: true,
    hotDrinksCount: { '7d_cow': 2, '7e': 1 },
    alcohol: { soda: 3, wine: 2, beer: 5, spirits: 1 },
    lunchDays: { '9c': 4, '9e': 3 }, dinnerDays: { '10a': 7 },
    bottledWater: '13a', foodHabits: ['localFood', 'noFoodWaste'], deliveryPerWeek: 2,
    clothes: '15c', electronics: ['16a', '16c'], appliances: ['19a', '19d'],
    pets: ['medDog', 'cat'], hygiene: '22b', smoking: '23c',
    sports: ['cycling', 'gym', 'ski'],
    videoCalls: 'vc_often', streaming: 'st_lots', socialMedia: 'sm_often', aiUsage: 'medium',
  }
  const minimal = {
    carKm: 'km_e', telework: 'never', homeType: '25a', heating: '26a',
    renewable: 'c', hasAC: 'no', pool: 'noPool', bottledWater: '13c',
    lunchDays: { none: 7 }, dinnerDays: { none: 7 }, aiUsage: 'none',
  }

  for (const [name, profile] of [['completo', full], ['mínimo', minimal]]) {
    const r1 = v1(profile), rc = cur(profile)
    if (r1.carbonTons !== rc.carbonTons) fail(`calculator [${name}]: carbonTons v1=${r1.carbonTons} actual=${rc.carbonTons}`)
    if (r1.carbonKg !== rc.carbonKg) fail(`calculator [${name}]: carbonKg v1=${r1.carbonKg} actual=${rc.carbonKg}`)
    for (const area of Object.keys(r1.areas)) {
      if (r1.areas[area] !== rc.areas[area]) fail(`calculator [${name}]: área ${area} v1=${r1.areas[area]} actual=${rc.areas[area]}`)
    }
    console.log(`  calculator [${name}]: v1 total=${r1.carbonTons} t · actual=${rc.carbonTons} t`)
  }
}

// ── Resultado ───────────────────────────────────────────────────────────────────
console.log('')
if (diffs.length === 0) {
  console.log('✓ Sin diferencias con v1-es: answerLabels, 38 acciones y calculator.js coinciden.')
  process.exit(0)
} else {
  console.error(`✗ ${diffs.length} DIFERENCIA(S) con v1-es:`)
  diffs.forEach(d => console.error('  -', d))
  process.exit(1)
}
