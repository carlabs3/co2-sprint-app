// Acceso a localStorage tolerante a fallos (navegación privada, cuota llena,
// storage deshabilitado). Si localStorage no está disponible, estas funciones
// no lanzan: devuelven null / no-op, para que el envío por socket y por HTTP
// siga funcionando igual.
export function safeGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
export function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}
export function safeRemove(key) {
  try { localStorage.removeItem(key) } catch { /* no-op */ }
}
export function safeKeys() {
  try { return Object.keys(localStorage) } catch { return [] }
}
