export const PUBLIC_SERVICES_KG = 1500

const MAP = {
  // ── TRANSPORTE ──
  car:           { '1a': 184, '1b': 797, '1c': 1839, '1d': 3677, '1e': 0 },
  electricCar:   { 'a': 146, 'b': 775, 'c': 1550, 'd': 3600, 'e': 0 },
  train:         { '3a': 21, '3b': 126, '3c': 630, '3d': 0 },
  moto:          { '4a': 11, '4b': 57, '4c': 228, '4d': 0 },
  urbanMobility: { '5a': 0, '5b': 2, '5c': 4, '5d': 5, '5e': 44 },

  // ── VIVIENDA ── (3 tablas de calefacción por tipo de vivienda)
  heatingSmall:  { '26a': 0, '26b': 625, '26c': 975,  '26d': 1429, '26e': 230, '26f': 375, '26g': 668 },
  heatingMedium: { '26a': 0, '26b': 750, '26c': 1170, '26d': 1715, '26e': 276, '26f': 450, '26g': 802 },
  heatingLarge:  { '26a': 0, '26b': 781, '26c': 1219, '26d': 1787, '26e': 288, '26f': 469, '26g': 835 },
  renewable:     { 'a': -720, 'b': -200, 'c': 0 },
  householdSize: { '1': 1, '2': 2, '3': 3, '4': 4, '4+': 4 },
  pool:          { privatePool: 50, communityPool: 17, noPool: 0 },
  homeHabits:    { closeWindows: -47, thermostat19: -47, ledBulbs: -4, ecoPrograms: -36, none: 0 },

  // ── ALIMENTACIÓN ──
  breakfast:    { '6a': 1081, '6b': 1633, '6c': 2595, '6d': 291, '6e': 1924 },
  milkType:     { 'a': 232, 'b': 82, 'c': 89, 'd': 64, 'e': 0 },
  hotDrinks:    { '7a': 0, '7b': 594, '7c': 18, '7d': 395, '7e': 124 },
  lunch:        { '9a': 110, '9b': 186, '9c': 317, '9d': 293, '9e': 1087, '9f': 2296, '9g': 745 },
  dinner:       { '10a': 110, '10b': 186, '10c': 317, '10d': 293, '10e': 1087, '10f': 2296, '10g': 745 },
  bottledWater: { '13a': 97, '13b': 49, '13c': 0 },
  foodHabits:   { localFood: -75, composting: -146, noFoodWaste: -80, none: 0 },

  // ── CONSUMO ──
  clothes:     { '15a': 75, '15b': 99, '15c': 187, '15d': 396, '15e': 594, '15f': 891, '15g': 15 },
  electronics: { '16a': 86, '16b': 63, '16c': 194, '16d': 302, '16e': 375, '16f': 73, '16g': 24, '16h': 10, '16i': 0 },
  appliances:  { '19a': 340, '19b': 302, '19c': 270, '19d': 257, '19e': 217, '19f': 415, '19g': 98, '19h': 375, '19i': 0 },
  pets:        { bigDog: 1100, medDog: 770, smallDog: 400, cat: 310, none: 0 },
  hygiene:     { '22a': 13, '22b': 18, '22c': 39 },
  smoking:     { '23a': 0, '23b': 20, '23c': 11, '23d': 46, '23e': 102 },

  // ── DIGITAL ──
  videoCalls:  { none: 0, less1h: 8, '1to2h': 18, more2h: 38 },
  streaming:   { none: 0, '1to2h': 16, '2to4h': 34, more4h: 69 },
  socialMedia: { none: 0, less1h: 16, '1to2h': 39, more2h: 82 },
  aiUsage:     { none: 0, low: 25, medium: 100, high: 250 },
}

// Bebidas alcohólicas — kgCO2e por unidad/semana × 52 semanas
const ALCOHOL_FACTORS = {
  soda:    0.472 * 0.25 * 52, // ~6.1 kg/unidad/año
  wine:    1.19  * 0.15 * 52, // ~9.3 kg/copa/año
  beer:    1.12  * 0.33 * 52, // ~19.2 kg/botellín/año
  spirits: 1.12  * 0.05 * 52, // ~2.9 kg/copa/año
}

export function calcAlcohol(alcohol = {}) {
  if (!alcohol || typeof alcohol !== 'object' || Array.isArray(alcohol)) return 0
  return Math.round(
    (alcohol.soda    || 0) * ALCOHOL_FACTORS.soda    +
    (alcohol.wine    || 0) * ALCOHOL_FACTORS.wine    +
    (alcohol.beer    || 0) * ALCOHOL_FACTORS.beer    +
    (alcohol.spirits || 0) * ALCOHOL_FACTORS.spirits
  )
}

function get(key, val) {
  return MAP[key]?.[val] ?? 0
}

function sum(key, vals) {
  const arr = Array.isArray(vals) ? vals : []
  return arr.reduce((s, v) => s + (MAP[key]?.[v] ?? 0), 0)
}

export function calculator(answers) {
  // ── Transporte ──────────────────────────────────────────────────────────────
  const carKg     = get('car', answers.car)
  const evKg      = get('electricCar', answers.electricCar)
  const flightsKg = (answers.flights?.includes('flightShort')  ? 824  : 0)
                  + (answers.flights?.includes('flightMedium') ? 1879 : 0)
                  + (answers.flights?.includes('flightLong')   ? 2627 : 0)
  const transportKg = carKg + evKg + flightsKg
    + get('train', answers.train)
    + get('moto', answers.moto)
    + get('urbanMobility', answers.urbanMobility)

  // ── Hogar ───────────────────────────────────────────────────────────────────
  const div = MAP.householdSize[answers.householdSize] ?? 2

  let heatingKg = 0
  if (answers.homeType === '25a')      heatingKg = MAP.heatingSmall[answers.heating]  ?? 0
  else if (answers.homeType === '25b') heatingKg = MAP.heatingMedium[answers.heating] ?? 0
  else if (answers.homeType === '25c') heatingKg = MAP.heatingLarge[answers.heating]  ?? 0

  let acKg = 0
  if (answers.hasAC === 'yes') {
    if (answers.homeType === '25a')      acKg = 350
    else if (answers.homeType === '25b') acKg = 420
    else if (answers.homeType === '25c') acKg = 438
  }

  const renewableKg = MAP.renewable[answers.renewable] ?? 0
  const poolKg      = sum('pool', answers.pool)

  const housingKg = Math.max(0,
    (heatingKg / div) +
    acKg +
    renewableKg +
    sum('homeHabits', answers.homeHabits) +
    poolKg +
    (answers.hotelNights   || 0) * 8 +
    (answers.hostelNights  || 0) * 1 +
    (answers.campingNights || 0) * 1 +
    (answers.airbnbNights  || 0) * 5 +
    (answers.secondHome    ? 250 : 0)
  )

  // ── Alimentación ────────────────────────────────────────────────────────────
  const foodKg = Math.max(0,
    get('breakfast', answers.breakfast) +
    get('milkType', answers.milkType) +
    sum('hotDrinks', answers.hotDrinks) +
    calcAlcohol(answers.alcohol) +
    get('lunch', answers.lunch) +
    get('dinner', answers.dinner) +
    get('bottledWater', answers.bottledWater) +
    sum('foodHabits', answers.foodHabits)
  )

  // ── Consumo ─────────────────────────────────────────────────────────────────
  const consumptionKg =
    get('clothes', answers.clothes) +
    sum('electronics', answers.electronics) +
    sum('appliances', answers.appliances) +
    sum('pets', answers.pets) +
    get('hygiene', answers.hygiene) +
    get('smoking', answers.smoking)

  // ── Huella digital + servicios públicos ────────────────────────────────────
  const digitalKg =
    get('videoCalls', answers.videoCalls) +
    get('streaming', answers.streaming) +
    get('socialMedia', answers.socialMedia) +
    get('aiUsage', answers.aiUsage) +
    PUBLIC_SERVICES_KG

  // ── Totales ─────────────────────────────────────────────────────────────────
  const totalKg    = transportKg + housingKg + foodKg + consumptionKg + digitalKg
  const carbonTons = parseFloat((totalKg / 1000).toFixed(2))

  return {
    carbonTons,
    carbonKg: Math.round(totalKg),
    areas: {
      transport:   parseFloat((transportKg   / 1000).toFixed(2)),
      energy:      parseFloat((housingKg     / 1000).toFixed(2)),
      food:        parseFloat((foodKg        / 1000).toFixed(2)),
      consumption: parseFloat((consumptionKg / 1000).toFixed(2)),
      waste:       parseFloat((digitalKg     / 1000).toFixed(2)),
    },
    category: carbonTons < 4 ? 'bajo' : carbonTons < 7 ? 'medio' : carbonTons < 10 ? 'alto' : 'muy alto',
  }
}
