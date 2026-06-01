export const PUBLIC_SERVICES_KG = 1500 // kgCO2e/año, fijo para España

const MAP = {
  car:             { none: 0, low: 700, med: 1800, high: 3800, electric: 450 },
  moto:            { no: 0, little: 150, daily: 650 },
  publicTransport: { walk_bike: 0, public: 200, mixed: 350, car_only: 600 },
  flights:         { national: 350, european: 750, long_haul: 2500 },
  homeType:        { flat_small: 500, flat_large: 950, house: 1800 },
  heating:         { none: 0, gas: 1300, oil: 1750, electric: 820, heatpump: 380 },
  hasAC:           { no: 0, little: 180, yes: 460 },
  renewable:       { yes: 0.60, partial: 0.82, no: 1.0 },
  householdSize:   { '1': 1, '2': 2, '3': 3, '4+': 4 },
  homeHabits:      { led: -90, short_shower: -75, cold_wash: -55, thermostat: -95 },
  diet:            { vegan: 1150, veggie: 1500, flexi: 2100, omni: 2700, meat: 3400 },
  localFood:       { always: -190, sometimes: -75, never: 0 },
  foodWaste:       { none: 0, little: 140, some: 330, lot: 580 },
  bottledWater:    { no: 0, sometimes: 45, always: 155 },
  foodHabits:      { organic: -95, no_plastic: -55, compost: -75, meal_plan: -95 },
  clothes:         { none: 50, few: 190, many: 430, lots: 780 },
  electronics:     { phone: 80, laptop: 340, tv: 280, wearable: 50 },
  appliances:      { fridge: 135, washer: 95, oven: 80, small: 75 },
  hygiene:         { low: 45, med: 115, high: 240 },
  smoking:         { no: 0, little: 95, yes: 340 },
  pets:            { dog_large: 720, dog_small: 330, cat: 280, other: 95 },
  videoCalls:      { none: 0, few: 14, some: 38, lots: 85 },
  streaming:       { none: 0, low: 19, med: 52, high: 105 },
  socialMedia:     { low: 9, med: 28, high: 70 },
}

function single(key, val) {
  return MAP[key]?.[val] ?? 0
}

function multi(key, vals) {
  const arr = Array.isArray(vals) ? vals : []
  return arr.reduce((sum, v) => sum + (MAP[key]?.[v] ?? 0), 0)
}

export function calculator(answers) {
  const transportKg =
    single('car', answers.car) +
    single('moto', answers.moto) +
    single('publicTransport', answers.publicTransport) +
    multi('flights', answers.flights)

  const div = MAP.householdSize[answers.householdSize] ?? 2
  const rf  = MAP.renewable[answers.renewable] ?? 1.0
  const housingBase = single('homeType', answers.homeType) + single('heating', answers.heating) + single('hasAC', answers.hasAC)
  const housingKg   = Math.max(0, (housingBase / div) * rf + multi('homeHabits', answers.homeHabits))

  const foodKg = Math.max(0,
    single('diet', answers.diet) +
    single('localFood', answers.localFood) +
    single('foodWaste', answers.foodWaste) +
    single('bottledWater', answers.bottledWater) +
    multi('foodHabits', answers.foodHabits)
  )

  const consumptionKg =
    single('clothes', answers.clothes) +
    multi('electronics', answers.electronics) +
    multi('appliances', answers.appliances) +
    single('hygiene', answers.hygiene) +
    single('smoking', answers.smoking) +
    multi('pets', answers.pets)

  const digitalKg =
    single('videoCalls', answers.videoCalls) +
    single('streaming', answers.streaming) +
    single('socialMedia', answers.socialMedia) +
    PUBLIC_SERVICES_KG

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
