export const AREA_QUESTIONS = [
  {
    areaId: 'transport',
    areaLabel: 'Transporte',
    areaEmoji: '🚗',
    areaColor: '#4a90d9',
    questions: [
      {
        key: '0-0',
        text: '¿Cómo te desplazas principalmente al trabajo o escuela?',
        options: [
          { value: 0,   label: 'Caminando o bicicleta', emoji: '🚶' },
          { value: 0.3, label: 'Transporte público',    emoji: '🚌' },
          { value: 0.8, label: 'Auto compartido',       emoji: '🤝' },
          { value: 1.5, label: 'Auto propio',           emoji: '🚗' },
        ],
      },
      {
        key: '0-1',
        text: '¿Cuántos vuelos haces al año?',
        options: [
          { value: 0,   label: 'Ninguno',         emoji: '🚫' },
          { value: 0.5, label: '1–2 cortos',      emoji: '✈️'  },
          { value: 1.5, label: '1–2 largos',      emoji: '🌍' },
          { value: 3.0, label: 'Más de 3 vuelos', emoji: '🛫' },
        ],
      },
    ],
  },
  {
    areaId: 'energy',
    areaLabel: 'Energía',
    areaEmoji: '⚡',
    areaColor: '#e8a020',
    questions: [
      {
        key: '1-0',
        text: '¿Qué tan alta es tu factura de electricidad mensual?',
        options: [
          { value: 0.1, label: 'Menos de $200', emoji: '💚' },
          { value: 0.3, label: '$200–$500',     emoji: '💡' },
          { value: 0.6, label: '$500–$1000',    emoji: '⚡' },
          { value: 1.0, label: 'Más de $1000',  emoji: '🔋' },
        ],
      },
      {
        key: '1-1',
        text: '¿Usas energías renovables en casa?',
        options: [
          { value: 0,   label: 'Sí, solar o eólica', emoji: '☀️' },
          { value: 0.2, label: 'Parcialmente',        emoji: '🌱' },
          { value: 0.5, label: 'Solo red eléctrica',  emoji: '🔌' },
          { value: 0.4, label: 'No sé',              emoji: '❓' },
        ],
      },
    ],
  },
  {
    areaId: 'food',
    areaLabel: 'Alimentación',
    areaEmoji: '🥗',
    areaColor: '#5aab5a',
    questions: [
      {
        key: '2-0',
        text: '¿Cuál es tu dieta principal?',
        options: [
          { value: 0.3, label: 'Vegana',         emoji: '🌱' },
          { value: 0.5, label: 'Vegetariana',    emoji: '🥗' },
          { value: 0.9, label: 'Poca carne',     emoji: '🥩' },
          { value: 1.8, label: 'Carne a diario', emoji: '🍖' },
        ],
      },
      {
        key: '2-1',
        text: '¿Con qué frecuencia desperdicias comida?',
        options: [
          { value: 0.1, label: 'Casi nunca', emoji: '✅' },
          { value: 0.3, label: 'A veces',    emoji: '🤔' },
          { value: 0.5, label: 'Seguido',    emoji: '😬' },
          { value: 0.8, label: 'Mucho',      emoji: '🗑️' },
        ],
      },
    ],
  },
  {
    areaId: 'consumption',
    areaLabel: 'Consumo',
    areaEmoji: '🛍️',
    areaColor: '#b07a30',
    questions: [
      {
        key: '3-0',
        text: '¿Cuánta ropa nueva compras al año?',
        options: [
          { value: 0.1, label: 'Casi nada o usada', emoji: '♻️' },
          { value: 0.3, label: '1–5 prendas',       emoji: '👕' },
          { value: 0.6, label: '6–20 prendas',      emoji: '🛍️' },
          { value: 1.0, label: 'Más de 20',         emoji: '🏪' },
        ],
      },
      {
        key: '3-1',
        text: '¿Cada cuánto renuevas dispositivos electrónicos?',
        options: [
          { value: 0.1, label: 'Más de 5 años',  emoji: '⏳' },
          { value: 0.3, label: 'Cada 3–5 años',  emoji: '📱' },
          { value: 0.6, label: 'Cada 1–2 años',  emoji: '🔄' },
          { value: 1.0, label: 'Menos de 1 año', emoji: '🆕' },
        ],
      },
    ],
  },
  {
    areaId: 'waste',
    areaLabel: 'Residuos',
    areaEmoji: '♻️',
    areaColor: '#7a7aaa',
    questions: [
      {
        key: '4-0',
        text: '¿Reciclas o separas tus residuos?',
        options: [
          { value: 0.05, label: 'Siempre',    emoji: '♻️' },
          { value: 0.2,  label: 'A veces',    emoji: '🔄' },
          { value: 0.4,  label: 'Casi nunca', emoji: '😔' },
          { value: 0.6,  label: 'Nunca',      emoji: '🚮' },
        ],
      },
    ],
  },
]
