export const PUBLIC_SERVICES_KG = 1500 // kgCO2e/año, fijo para España

// Valores de referencia por respuesta (kgCO2e/año)
const MAP = {
  // Transporte — coche (km base antes de factor combustible)
  car:           { '1a': 500, '1b': 1200, '1c': 2500, '1d': 4000, '1e': 0 },
  // Factor por tipo de combustible (multiplica km coche)
  electricCar:   { 'a': 0.15, 'b': 0.5, 'c': 0.75, 'd': 0.9, 'e': 1.0 },
  // Tren larga distancia
  train:         { '3a': 80, '3b': 40, '3c': 15, '3d': 0 },
  // Moto
  moto:          { '4a': 50, '4b': 250, '4c': 650, '4d': 0 },
  // Movilidad urbana
  urbanMobility: { '5a': 0, '5b': 100, '5c': 300, '5d': 500, '5e': 750 },

  // Hogar — tamaño y tipo
  homeType:    { '25a': 400, '25b': 750, '25c': 1200 },
  // Calefacción (por hogar, antes de dividir por personas)
  heating:     { '26a': 50, '26b': 1000, '26c': 700, '26d': 2200, '26e': 200, '26f': 250 },
  // Factor renovables (reduce el total hogar)
  renewable:   { 'a': 0.40, 'b': 0.70, 'c': 1.0 },
  // Aire acondicionado
  hasAC:       { 'no': 0, 'yes': 460 },
  // Divisor por personas en el hogar
  householdSize: { '1': 1, '2': 2, '3': 3, '4+': 4 },
  // Hábitos hogar (reducciones, multi)
  homeHabits:  { closeWindows: -40, thermostat19: -80, ledBulbs: -60, ecoPrograms: -50 },

  // Alimentación
  breakfast:    { '6a': 1081, '6b': 1633, '6c': 2595, '6d': 291, '6e': 1924 },
  milkType:     { 'a': 200, 'b': 30, 'c': 0 },
  hotDrinks:    { '7a': 0, '7b': 594, '7c': 18, '7d': 395, '7e': 124 },
  alcohol:      { soda_low: 9, soda_mid: 21, soda_high: 37, wine_low: 14, wine_mid: 32, wine_high: 56, beer_low: 44, beer_mid: 102, beer_high: 175, spirit_low: 4, spirit_mid: 10, spirit_high: 17, none: 0 },
  lunch:        { '9a': 300, '9b': 400, '9c': 500, '9d': 700, '9e': 900, '9f': 1300 },
  dinner:       { '10a': 300, '10b': 400, '10c': 500, '10d': 700, '10e': 900, '10f': 1300 },
  bottledWater: { '13a': 200, '13b': 80, '13c': 0 },
  // Hábitos alimentarios (reducciones, multi)
  foodHabits:   { localFood: -80, composting: -60, noFoodWaste: -120, organic: -90, noPlastic: -50 },

  // Consumo — ropa
  clothes:     { '15a': 80, '15b': 200, '15c': 380, '15d': 550, '15e': 730, '15f': 900, '15g': 30 },
  // Dispositivos electrónicos comprados (multi)
  electronics: { '16a': 350, '16b': 80, '16c': 280, '16d': 100, '16e': 150, '16f': 50, '16g': 80, '16h': 60, '16i': 0 },
  // Electrodomésticos comprados (multi)
  appliances:  { '19a': 180, '19b': 120, '19c': 100, '19d': 90, '19e': 80, '19f': 50, '19g': 60, '19h': 100, '19i': 0 },
  // Mascotas (multi, kgCO2e anual)
  pets:        { bigDog: 720, smallDog: 330, cat: 280, rabbit: 100, bird: 80 },
  // Higiene y limpieza
  hygiene:     { '22a': 30, '22b': 100, '22c': 250 },
  // Tabaco
  smoking:     { '23a': 0, '23b': 80, '23c': 180, '23d': 300, '23e': 480 },

  // Digital
  videoCalls:  { none: 0, less1h: 8, '1to2h': 20, more2h: 50 },
  streaming:   { none: 0, less1h: 12, '1to4h': 35, more4h: 80 },
  socialMedia: { less1h: 7, '1to2h': 18, more2h: 40 },
  aiUsage:     { none: 0, low: 25, medium: 100, high: 250 },
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
  const carKg      = get('car', answers.car) * (MAP.electricCar[answers.electricCar] ?? 1.0)
  const flightsKg  = (answers.flights?.includes('flightShort')  ? 600  : 0)
                   + (answers.flights?.includes('flightMedium') ? 1500 : 0)
                   + (answers.flights?.includes('flightLong')   ? 3500 : 0)
  const transportKg = carKg + flightsKg
    + get('train', answers.train)
    + get('moto', answers.moto)
    + get('urbanMobility', answers.urbanMobility)

  // ── Hogar ───────────────────────────────────────────────────────────────────
  const div       = MAP.householdSize[answers.householdSize] ?? 2
  const rf        = MAP.renewable[answers.renewable] ?? 1.0
  const homeBase  = get('homeType', answers.homeType) + get('heating', answers.heating) + get('hasAC', answers.hasAC)
  const housingKg = Math.max(0, (homeBase / div) * rf + sum('homeHabits', answers.homeHabits))
    + (answers.hotelNights   || 0) * 8
    + (answers.hostelNights  || 0) * 1
    + (answers.campingNights || 0) * 1
    + (answers.airbnbNights  || 0) * 5
    + (answers.secondHome    ? 250 : 0)

  // ── Alimentación ────────────────────────────────────────────────────────────
  const foodKg = Math.max(0,
    get('breakfast', answers.breakfast) +
    get('milkType', answers.milkType) +
    sum('hotDrinks', answers.hotDrinks) +
    sum('alcohol', answers.alcohol) +
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
      transport:   parseFloat((transportKg / 1000).toFixed(2)),
      energy:      parseFloat((housingKg / 1000).toFixed(2)),
      food:        parseFloat((foodKg / 1000).toFixed(2)),
      consumption: parseFloat((consumptionKg / 1000).toFixed(2)),
      waste:       parseFloat((digitalKg / 1000).toFixed(2)),
    },
    category: carbonTons < 4 ? 'bajo' : carbonTons < 7 ? 'medio' : carbonTons < 10 ? 'alto' : 'muy alto',
  }
}
