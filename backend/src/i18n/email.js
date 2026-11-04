// Traducciones del email por idioma. Mantener sincronizadas con las del
// frontend (frontend/src/i18n/locales/*.json): areas, subcategorías y mensajes
// por categoría usan los mismos textos. Para t04 el frontend usa la versión
// corta (no aparece en el email; aquí solo áreas/subcategorías/mensajes).

const T = {
  es: {
    subject: 'Tu huella de carbono — {tons} t CO₂/año',
    p1: 'Gracias por participar en nuestro taller CO₂ Sprint de Drop. 🌱',
    p2: 'Calcular tu huella no es un examen — es conocer tu punto de partida. Pero ese mismo número tiene otra lectura: cuanto mayor es nuestra huella, más dependemos de un sistema frágil. Y eso, poco a poco, podemos cambiarlo.',
    p3: 'Aquí tienes tus resultados:',
    totalLabel: 'Tu huella total',
    unit: 'CO₂/año',
    breakdownTitle: 'Desglose por áreas',
    subcatTitle: 'Detalle por categoría',
    objectiveTitle: '🎯 El objetivo: 2 t CO₂e por persona para 2050',
    objectiveText: 'El objetivo de España para alcanzar la neutralidad climática y contribuir a limitar el calentamiento global a +2°C.',
    collectiveTitle: 'Importante: esto no va solo de ti',
    collectiveP1: 'La descarbonización es un esfuerzo colectivo.',
    collectiveState: '· El Estado puede acelerar la transición con leyes, ayudas e inversiones.',
    collectiveCity: '· Los ayuntamientos configuran el entorno en el que vivimos: el transporte, los espacios, los servicios. Sus decisiones pueden impulsar prácticas más sostenibles locales.',
    collectiveCompanies: '· Las empresas trabajan para reducir progresivamente la huella de sus productos y servicios.',
    footer: "Drop. · Taller de huella de carbono · Una iniciativa de Three o'clock",
    categoryMsg: {
      bajo:       '¡Genial! Tu huella está muy por debajo de la media',
      medio:      'Tu huella es moderada, hay margen de mejora',
      alto:       'Tu huella está por encima de lo sostenible',
      'muy alto': 'Tu huella es alta — este taller es para ti',
    },
    areas: {
      transport: 'Transporte', energy: 'Vivienda', food: 'Alimentación',
      consumption: 'Compras y hábitos', waste: 'Vida digital', publicServices: 'Servicios públicos',
    },
    subcats: {
      privateVehicle: 'Vehículo privado', flights: 'Vuelos', publicActive: 'Transporte público y activo', telework: 'Teletrabajo',
      heating: 'Calefacción y agua caliente', cooling: 'Refrigeración', extras: 'Extras (piscina y vacaciones)', renewable: 'Energía renovable', efficiency: 'Hábitos de eficiencia',
      dailyDiet: 'Dieta diaria', drinks: 'Bebidas', sustainable: 'Hábitos sostenibles',
      fashion: 'Moda', tech: 'Tecnología', lifestyle: 'Estilo de vida',
      screens: 'Uso de pantallas', ai: 'Inteligencia artificial',
      collective: 'Servicios colectivos',
    },
  },
  en: {
    subject: 'Your carbon footprint — {tons} t CO₂e/year',
    p1: 'Thanks for taking part in our Drop. CO₂ Sprint workshop. 🌱',
    p2: "Working out your footprint isn't a test — it's about knowing your starting point. But that number has another reading: the bigger our footprint, the more we depend on a fragile system. And that, little by little, we can change.",
    p3: 'Here are your results:',
    totalLabel: 'Your total footprint',
    unit: 'CO₂e/year',
    breakdownTitle: 'Breakdown by area',
    subcatTitle: 'Detail by category',
    objectiveTitle: '🎯 The goal: 2 t CO₂e per person by 2050',
    objectiveText: "Spain's target for reaching climate neutrality and helping limit global warming to +2°C.",
    collectiveTitle: "Important: this isn't only about you",
    collectiveP1: 'Decarbonisation is a collective effort.',
    collectiveState: '· The State can speed up the transition with laws, grants and investment.',
    collectiveCity: '· Local councils shape the environment we live in: transport, spaces, services. Their decisions can drive more sustainable local practices.',
    collectiveCompanies: '· Companies work to progressively reduce the footprint of their products and services.',
    footer: "Drop. · Carbon footprint workshop · An initiative by Three o'clock",
    categoryMsg: {
      bajo:       'Great! Your footprint is well below average',
      medio:      "Your footprint is moderate — there's room to improve",
      alto:       "Your footprint is above what's sustainable",
      'muy alto': 'Your footprint is high — this workshop is for you',
    },
    areas: {
      transport: 'Transport', energy: 'Housing', food: 'Food',
      consumption: 'Shopping & habits', waste: 'Digital life', publicServices: 'Public services',
    },
    subcats: {
      privateVehicle: 'Private vehicle', flights: 'Flights', publicActive: 'Public & active transport', telework: 'Remote working',
      heating: 'Heating & hot water', cooling: 'Cooling', extras: 'Extras (pool & holidays)', renewable: 'Renewable energy', efficiency: 'Efficiency habits',
      dailyDiet: 'Daily diet', drinks: 'Drinks', sustainable: 'Sustainable habits',
      fashion: 'Fashion', tech: 'Technology', lifestyle: 'Lifestyle',
      screens: 'Screen time', ai: 'Artificial intelligence',
      collective: 'Collective services',
    },
  },
}

export function emailT(lang) {
  return T[lang === 'en' ? 'en' : 'es']
}

// Número en el locale de la sesión (ES coma decimal, EN punto). Decimales fijos.
export function emailNum(lang, value, decimals = 1) {
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0)
}
