import i18n from '../i18n/index.js'

// Locale de formato según el idioma activo (es → es-ES, en → en-GB).
// ES muestra coma decimal (2,4 t) y EN punto (2.4 t). No cambia nº de decimales.
function activeLocale() {
  return i18n.language === 'en' ? 'en-GB' : 'es-ES'
}

// Toneladas: hasta 2 decimales, recortando ceros finales (2.40 → "2,4", 8 → "8").
export function fmtTons(value) {
  return new Intl.NumberFormat(activeLocale(), { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

// Número con un número fijo de decimales (por defecto 1), en el locale activo.
export function fmtNum(value, decimals = 1) {
  return new Intl.NumberFormat(activeLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0)
}

// Fecha formateada en el idioma de la sesión.
export function fmtDate(iso, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  return new Date(iso).toLocaleDateString(activeLocale(), opts)
}
