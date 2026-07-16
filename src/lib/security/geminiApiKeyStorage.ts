const GEMINI_API_KEY_STORAGE_KEY = 'userGeminiApiKey';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

export function loadGeminiApiKey(
  sessionStore: KeyValueStorage,
  localStore: KeyValueStorage,
): string {
  const sessionKey = sessionStore.getItem(GEMINI_API_KEY_STORAGE_KEY) ?? '';
  const legacyKey = localStore.getItem(GEMINI_API_KEY_STORAGE_KEY) ?? '';
  localStore.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  if (!sessionKey && legacyKey) sessionStore.setItem(GEMINI_API_KEY_STORAGE_KEY, legacyKey);
  return sessionKey || legacyKey;
}

export function saveGeminiApiKey(value: string, sessionStore: KeyValueStorage): string {
  const trimmed = value.trim();
  sessionStore.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
  return trimmed;
}

export function clearGeminiApiKey(
  sessionStore: KeyValueStorage,
  localStore: KeyValueStorage,
): void {
  sessionStore.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  localStore.removeItem(GEMINI_API_KEY_STORAGE_KEY);
}

export function loadBrowserGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  return loadGeminiApiKey(window.sessionStorage, window.localStorage);
}

export function saveBrowserGeminiApiKey(value: string): string {
  if (typeof window === 'undefined') return value.trim();
  return saveGeminiApiKey(value, window.sessionStorage);
}

export function clearBrowserGeminiApiKey(): void {
  if (typeof window === 'undefined') return;
  clearGeminiApiKey(window.sessionStorage, window.localStorage);
}
