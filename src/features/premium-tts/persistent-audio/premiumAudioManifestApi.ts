import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase/firebaseClient';
import { PremiumAudioAsset } from './premiumAudioTypes';
import { OperationType } from '../../cloud-lessons/cloudLessonApi';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[premiumAudioManifestApi] Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getLessonAudioAssets(userId: string, lessonId: string): Promise<PremiumAudioAsset[]> {
  const path = `users/${userId}/lessons/${lessonId}/audioAssets`;
  try {
    const ref = collection(db, 'users', userId, 'lessons', lessonId, 'audioAssets');
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({
      ...doc.data()
    })) as PremiumAudioAsset[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function savePremiumAudioAsset(
  userId: string,
  lessonId: string,
  asset: PremiumAudioAsset
): Promise<void> {
  const path = `users/${userId}/lessons/${lessonId}/audioAssets/${asset.assetId}`;
  try {
    const ref = doc(db, 'users', userId, 'lessons', lessonId, 'audioAssets', asset.assetId);
    await setDoc(ref, asset);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePremiumAudioAssetStatus(
  userId: string,
  lessonId: string,
  assetId: string,
  updates: Partial<PremiumAudioAsset>
): Promise<void> {
  const path = `users/${userId}/lessons/${lessonId}/audioAssets/${assetId}`;
  try {
    const ref = doc(db, 'users', userId, 'lessons', lessonId, 'audioAssets', assetId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePremiumAudioAsset(
  userId: string,
  lessonId: string,
  assetId: string
): Promise<void> {
  const path = `users/${userId}/lessons/${lessonId}/audioAssets/${assetId}`;
  try {
    const ref = doc(db, 'users', userId, 'lessons', lessonId, 'audioAssets', assetId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function cleanupLessonAudioAssets(userId: string, lessonId: string): Promise<void> {
  const path = `users/${userId}/lessons/${lessonId}/audioAssets`;
  try {
    const ref = collection(db, 'users', userId, 'lessons', lessonId, 'audioAssets');
    const snap = await getDocs(ref);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'users', userId, 'lessons', lessonId, 'audioAssets', d.id)));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
