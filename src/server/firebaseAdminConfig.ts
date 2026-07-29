import {
  nonEmptyConfigString,
  type FirebaseClientConfig,
} from '../lib/firebase/firebaseClientConfig.js';

export type { FirebaseClientConfig } from '../lib/firebase/firebaseClientConfig.js';

export interface FirebaseAdminEnvironment {
  FIREBASE_PROJECT_ID?: string;
  GCLOUD_PROJECT?: string;
  FIRESTORE_DATABASE_ID?: string;
}

export function resolveFirebaseAdminConfig(
  clientConfig: FirebaseClientConfig,
  environment: FirebaseAdminEnvironment,
): { projectId: string; databaseId?: string } {
  const projectId = nonEmptyConfigString(environment.FIREBASE_PROJECT_ID)
    ?? nonEmptyConfigString(environment.GCLOUD_PROJECT)
    ?? nonEmptyConfigString(clientConfig.projectId);

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID or firebase-applet-config.json projectId is required.');
  }

  const databaseId = nonEmptyConfigString(environment.FIRESTORE_DATABASE_ID)
    ?? nonEmptyConfigString(clientConfig.firestoreDatabaseId);

  return databaseId ? { projectId, databaseId } : { projectId };
}
