const ACTIVE_API_KEY_KEY = 'lunchbox.apiKey.active';

export function getActiveApiKey(): string | null {
  return localStorage.getItem(ACTIVE_API_KEY_KEY);
}

export function setActiveApiKey(apiKey: string): void {
  localStorage.setItem(ACTIVE_API_KEY_KEY, apiKey);
}

export function clearActiveApiKey(): void {
  localStorage.removeItem(ACTIVE_API_KEY_KEY);
}
