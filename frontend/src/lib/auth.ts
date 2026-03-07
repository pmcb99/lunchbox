const AUTH_EMAIL_KEY = 'lunchbox.auth.email';
const AUTH_TOKEN_KEY = 'lunchbox.auth.token';

export function getAuthEmail(): string | null {
  return localStorage.getItem(AUTH_EMAIL_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuth(email: string, token: string): void {
  localStorage.setItem(AUTH_EMAIL_KEY, email);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_EMAIL_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
