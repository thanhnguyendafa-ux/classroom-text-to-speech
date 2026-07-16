import fs from 'node:fs';
import path from 'node:path';
import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { resolveFirebaseAdminConfig, type FirebaseClientConfig } from './firebaseAdminConfig.js';

function readClientConfig(): FirebaseClientConfig {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseClientConfig;
  } catch (error) {
    if (process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT) {
      return {};
    }
    throw new Error(`Unable to load Firebase project configuration from ${configPath}.`, { cause: error });
  }
}

const adminConfig = resolveFirebaseAdminConfig(readClientConfig(), process.env);
const adminApp = getApps().length > 0
  ? getApp()
  : initializeApp({
      projectId: adminConfig.projectId,
      credential: applicationDefault(),
    });

export const adminDb = adminConfig.databaseId
  ? getFirestore(adminApp, adminConfig.databaseId)
  : getFirestore(adminApp);

export const adminAuth = getAuth(adminApp);
