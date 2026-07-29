export interface FirebaseClientConfig {
  projectId?: unknown;
  firestoreDatabaseId?: unknown;
}

export function nonEmptyConfigString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function resolveFirestoreDatabaseId(config: FirebaseClientConfig): string | undefined {
  return nonEmptyConfigString(config.firestoreDatabaseId);
}
