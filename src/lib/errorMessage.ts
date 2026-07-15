function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function errorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  const message = record(error)?.message;
  return typeof message === 'string' && message ? message : fallback;
}

export function errorCode(error: unknown): string | null {
  const code = record(error)?.code;
  return typeof code === 'string' && code ? code : null;
}
