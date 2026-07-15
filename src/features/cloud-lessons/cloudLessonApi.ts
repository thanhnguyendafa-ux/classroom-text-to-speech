import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/firebaseClient';
import { cleanupLessonAudioAssets } from '../premium-tts/persistent-audio/premiumAudioManifestApi';
import { cleanupLessonAudioStorage } from '../premium-tts/persistent-audio/premiumAudioStorageApi';
import { LessonDocument, LessonDraft } from '../../types';
import { hydrateLessonDocument } from '../../domain/lessonModel';
import { assertExpectedRevision, LessonConflictError, nextRevision } from '../../domain/lessonRevision';
import { summarizeCleanupResults } from '../../domain/lessonDeletion';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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
  if (error instanceof LessonConflictError) throw error;
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CloudFolder {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export type CloudLesson = LessonDocument;

// 1. User Profile API
export async function createOrUpdateUserProfile(
  uid: string, 
  displayName: string, 
  email: string, 
  photoURL: string | null
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userRef);
    const now = Date.now();
    
    if (existingSnap.exists()) {
      await updateDoc(userRef, {
        displayName,
        email,
        photoURL,
        lastLoginAt: now
      });
    } else {
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
        createdAt: now,
        lastLoginAt: now
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Folder API
export async function listFolders(uid: string): Promise<CloudFolder[]> {
  const path = `users/${uid}/folders`;
  try {
    const foldersRef = collection(db, 'users', uid, 'folders');
    const q = query(foldersRef, orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CloudFolder[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createFolder(uid: string, folderId: string, name: string): Promise<void> {
  const path = `users/${uid}/folders/${folderId}`;
  try {
    const folderRef = doc(db, 'users', uid, 'folders', folderId);
    const now = Date.now();
    await setDoc(folderRef, {
      name,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFolder(uid: string, folderId: string, name: string): Promise<void> {
  const path = `users/${uid}/folders/${folderId}`;
  try {
    const folderRef = doc(db, 'users', uid, 'folders', folderId);
    await updateDoc(folderRef, {
      name,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFolder(uid: string, folderId: string): Promise<void> {
  const path = `users/${uid}/folders/${folderId}`;
  try {
    const folderRef = doc(db, 'users', uid, 'folders', folderId);
    await deleteDoc(folderRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Lessons API
export async function listLessons(uid: string): Promise<CloudLesson[]> {
  const path = `users/${uid}/lessons`;
  try {
    const lessonsRef = collection(db, 'users', uid, 'lessons');
    const q = query(lessonsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(snapshot =>
      hydrateLessonDocument(snapshot.id, snapshot.data())
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createLesson(uid: string, lessonId: string, lesson: LessonDraft): Promise<number> {
  const path = `users/${uid}/lessons/${lessonId}`;
  try {
    const lessonRef = doc(db, 'users', uid, 'lessons', lessonId);
    const now = Date.now();
    await setDoc(lessonRef, {
      schemaVersion: 1,
      revision: 1,
      id: lessonId,
      ...lesson,
      createdAt: now,
      updatedAt: now
    });
    return 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateLesson(
  uid: string,
  lessonId: string,
  updates: Partial<LessonDraft>,
  expectedRevision?: number,
): Promise<number> {
  const path = `users/${uid}/lessons/${lessonId}`;
  try {
    const lessonRef = doc(db, 'users', uid, 'lessons', lessonId);
    return await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(lessonRef);
      if (!snapshot.exists()) throw new Error('Bài học không còn tồn tại.');
      const currentRevision = Math.max(1, Number(snapshot.data().revision) || 1);
      assertExpectedRevision(currentRevision, expectedRevision);
      const revision = nextRevision(currentRevision);
      transaction.update(lessonRef, { ...updates, revision, updatedAt: Date.now() });
      return revision;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLesson(uid: string, lessonId: string): Promise<void> {
  const path = `users/${uid}/lessons/${lessonId}`;
  try {
    await updateLesson(uid, lessonId, { deletionStatus: 'deleting', deletionError: null });
    const cleanupResults = await Promise.allSettled([
      cleanupLessonAudioAssets(uid, lessonId),
      cleanupLessonAudioStorage(uid, lessonId),
    ]);
    const summary = summarizeCleanupResults(cleanupResults);
    if (!summary.canFinalize) {
      await updateLesson(uid, lessonId, {
        deletionStatus: 'cleanup_failed',
        deletionError: `${summary.failureCount} cleanup operation(s) failed`,
      });
      throw new Error('Không thể xóa hoàn toàn dữ liệu âm thanh. Bài học được giữ lại để thử lại an toàn.');
    }
    await deleteDoc(doc(db, 'users', uid, 'lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}