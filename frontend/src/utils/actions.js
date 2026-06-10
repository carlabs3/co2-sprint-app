export const MAX_POINTS = 10

export const AREA_EMOJI = {
  transport:   '🚗',
  energy:      '🏠',
  food:        '🥗',
  consumption: '🛍️',
  waste:       '📱',
}

export const AREA_COLOR = {
  transport:   '#4a90d9',
  energy:      '#e8a020',
  food:        '#5aab5a',
  consumption: '#b07a30',
  waste:       '#7a7aaa',
}

export const AREA_LABEL = {
  transport:   'Transporte',
  energy:      'Vivienda',
  food:        'Alimentación',
  consumption: 'Consumo',
  waste:       'Digital',
}

export const TYPE_LABEL = {
  individual: 'Individual',
  colectiva:  'Colectiva',
  laboral:    'Laboral',
}

export const ACTIONS = [
  // TRANSPORTE
  { id: 'a01', label: 'Dejar el coche 2 días a la semana',               area: 'transport', cost: 3, co2Reduction: 800,  description: 'Usa transporte público, bici o camina 2 días.' },
  { id: 'a02', label: 'Sustituir un vuelo corto por tren',                area: 'transport', cost: 4, co2Reduction: 900,  description: 'Un vuelo Madrid-París emite 10× más que el tren.' },
  { id: 'a03', label: 'Compartir coche al trabajo',                       area: 'transport',  cost: 2, co2Reduction: 500,  description: 'Carpool con un compañero reduce emisiones a la mitad.' },
  { id: 'a04', label: 'Cambiar a bici o patinete para trayectos cortos',  area: 'transport', cost: 2, co2Reduction: 300,  description: 'Para distancias menores de 5 km.' },
  { id: 'a05', label: 'No coger el avión en vacaciones este año',          area: 'transport', cost: 5, co2Reduction: 1800, description: 'El transporte aéreo es el factor individual más impactante.' },

  // VIVIENDA / ENERGÍA
  { id: 'a06', label: 'Bajar la calefacción a 19 °C',                     area: 'energy', cost: 1, co2Reduction: 400,  description: 'Cada grado menos ahorra un 7% en calefacción.' },
  { id: 'a07', label: 'Cambiar a tarifa 100% renovable',                  area: 'energy', cost: 2, co2Reduction: 300,  description: 'Fácil de contratar, impacto inmediato.' },
  { id: 'a08', label: 'Instalar paneles solares',                         area: 'energy',  cost: 5, co2Reduction: 720,  description: 'Instalación media de 3 kWp en España.' },
  { id: 'a09', label: 'Usar programas eco en lavadora y lavavajillas',    area: 'energy', cost: 1, co2Reduction: 120,  description: 'Ahorra agua caliente y electricidad.' },

  // ALIMENTACIÓN
  { id: 'a10', label: 'Reducir carne roja a 1 vez por semana',            area: 'food', cost: 2, co2Reduction: 600,  description: 'La carne de vacuno emite 6× más que el pollo.' },
  { id: 'a11', label: 'Dieta vegetariana completa',                       area: 'food', cost: 4, co2Reduction: 1200, description: 'Una de las acciones individuales de mayor impacto.' },
  { id: 'a12', label: 'Comprar productos locales y de temporada',         area: 'food', cost: 1, co2Reduction: 150,  description: 'Reduce el transporte y la refrigeración.' },
  { id: 'a13', label: 'Eliminar el desperdicio alimentario',              area: 'food', cost: 1, co2Reduction: 180,  description: 'El 30% de la comida se tira — reducirlo importa.' },

  // CONSUMO
  { id: 'a14', label: 'Comprar solo ropa de segunda mano durante 1 año',  area: 'consumption', cost: 2, co2Reduction: 400,  description: 'La industria textil emite un 10% de los GEI globales.' },
  { id: 'a15', label: 'No comprar smartphone nuevo este año',              area: 'consumption', cost: 2, co2Reduction: 200,  description: 'La fabricación representa el 80% de su huella.' },
  { id: 'a16', label: 'Reparar en lugar de reemplazar electrodomésticos', area: 'consumption', cost: 3, co2Reduction: 350,  description: 'Alargar la vida útil 2 años reduce la huella a la mitad.' },

  // DIGITAL
  { id: 'a17', label: 'Reducir streaming a 1 h/día',                      area: 'waste', cost: 1, co2Reduction: 80,   description: 'Ver en móvil en lugar de TV reduce un 75% el consumo.' },
  { id: 'a18', label: 'Limpiar el email y desuscribirse de newsletters',   area: 'waste', cost: 1, co2Reduction: 50,   description: 'Cada email almacenado consume energía en servidores.' },
]
