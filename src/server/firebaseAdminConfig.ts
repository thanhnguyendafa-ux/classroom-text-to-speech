export interface FirebaseClientConfig {
  projectId?: unknown;
  firestoreDatabaseId?: unknown;
}

export interface FirebaseAdminEnvironment {
  FIREBASE_PROJECT_ID?: string;
  GCLOUD_PROJECT?: string;
  FIRESTORE_DATABASE_ID?: string;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function resolveFirebaseAdminConfig(
  clientConfig: FirebaseClientConfig,
  environment: FirebaseAdminEnvironment,
): { projectId: string; databaseId?: string } {
  const projectId = nonEmptyString(environment.FIREBASE_PROJECT_ID)
    ?? nonEmptyString(environment.GCLOUD_PROJECT)
    ?? nonEmptyString(clientConfig.projectId);

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID or firebase-applet-config.json projectId is required.');
  }

  const databaseId = nonEmptyString(environment.FIRESTORE_DATABASE_ID)
    ?? nonEmptyString(clientConfig.firestoreDatabaseId);

  return databaseId ? { projectId, databaseId } : { projectId };
}
