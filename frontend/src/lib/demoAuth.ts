const AUTH_FLAG_KEY = 'lunchbox.demo-auth';

export const DEMO_EMAIL = 'demo@lunchbox.dev';
export const DEMO_PASSWORD = 'lunchbox-demo';

export function isDemoAuthed() {
  return localStorage.getItem(AUTH_FLAG_KEY) === 'true';
}

export function signInDemo() {
  localStorage.setItem(AUTH_FLAG_KEY, 'true');
}

export function signOutDemo() {
  localStorage.removeItem(AUTH_FLAG_KEY);
}
