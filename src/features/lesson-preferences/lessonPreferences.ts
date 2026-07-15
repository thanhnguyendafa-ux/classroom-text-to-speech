export interface ReadableStorage {
  getItem(key: string): string | null;
}

export function readStoredValue(
  storage: ReadableStorage,
  key: string,
  fallback: string,
) {
  return storage.getItem(key) ?? fallback;
}

export function parseLoopMode(value: string): 'once' | 'infinite' {
  return value === 'infinite' ? 'infinite' : 'once';
}

export function parseRowLayoutMode(value: string): 'below' | 'side' {
  return value === 'side' ? 'side' : 'below';
}
