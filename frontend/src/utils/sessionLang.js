import i18n from '../i18n/index.js'

// Aplica el idioma de la sesión: cambia i18next y el atributo lang del <html>.
// Las sesiones sin campo lang (antiguas) se tratan como 'es'.
export function applySessionLang(lang) {
  const l = lang === 'en' ? 'en' : 'es'
  if (i18n.language !== l) i18n.changeLanguage(l)
  if (typeof document !== 'undefined') document.documentElement.lang = l
}
