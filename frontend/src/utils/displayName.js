// Nombre a MOSTRAR (no cambia lo que se guarda en la base de datos).
// Si el nombre está vacío o es el marcador 'Anónimo', se muestra la
// traducción de common.anonymous según el idioma activo.
export function displayName(name, t) {
  if (!name || name === 'Anónimo') return t('common.anonymous')
  return name
}
