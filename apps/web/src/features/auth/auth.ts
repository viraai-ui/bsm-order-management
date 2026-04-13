const TOKEN_KEY = 'bsm.session.demo';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(TOKEN_KEY) === 'authenticated';
}

export function signInDemoUser() {
  window.localStorage.setItem(TOKEN_KEY, 'authenticated');
}

export function signOutDemoUser() {
  window.localStorage.removeItem(TOKEN_KEY);
}
