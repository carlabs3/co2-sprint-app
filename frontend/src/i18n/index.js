import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import es from './locales/es.json'
import en from './locales/en.json'

// Español es el idioma por defecto y de respaldo.
// Las claves se organizan por pantalla/sección: p.ej. "step2Calculator.title",
// "areas.transport", "actions.t01.title".
i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // React ya escapa los valores
    },
  })

export default i18n
