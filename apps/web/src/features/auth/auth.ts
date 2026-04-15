const TOKEN_KEY = 'bsm.session.authenticated';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(TOKEN_KEY) === 'authenticated';
}

export function markAuthenticated() {
  window.localStorage.setItem(TOKEN_KEY, 'authenticated');
}

export function clearAuthenticated() {
  window.localStorage.removeItem(TOKEN_KEY);
}
