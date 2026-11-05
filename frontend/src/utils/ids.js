// Identificador único. Usa crypto.randomUUID() si está disponible; si no,
// cae a una combinación de timestamp + aleatorio (suficiente para deduplicar
// envíos). No afecta al cálculo ni a los IDs de áreas/acciones.
export function uid() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
