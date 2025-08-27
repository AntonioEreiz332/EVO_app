export function saveUserSession(user) {
  localStorage.setItem('auth_user', JSON.stringify(user));
}
export function getUserSession() {
  const raw = localStorage.getItem('auth_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearUserSession() {
  localStorage.removeItem('auth_user');
}
