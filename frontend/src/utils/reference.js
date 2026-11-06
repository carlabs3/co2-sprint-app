// Cifra de referencia por idioma para las comparativas (gráfica de resultados,
// "% above/below", fuente, pantalla de equipo, rankings). No afecta al cálculo.
// ES = España (sin cambios). EN = Irlanda (solo total disponible).
export const REFERENCE = {
  es: {
    total: 8.1,
    areas: { transport: 2.1, energy: 1.8, food: 1.6, consumption: 1.4, waste: 1.2, publicServices: 1.5 },
  },
  en: {
    total: 14.0,
    areas: null,
  },
}

export function getReference(lang) {
  return REFERENCE[lang === 'en' ? 'en' : 'es']
}
