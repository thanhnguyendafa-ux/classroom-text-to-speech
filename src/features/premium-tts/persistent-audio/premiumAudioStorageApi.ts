import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../../../lib/firebase/firebaseClient';

export async function uploadAudioFile(
  userId: string,
  lessonId: string,
  assetId: string,
  audioBlob: Blob
): Promise<string> {
  const path = `users/${userId}/lessons/${lessonId}/premium-audio/${assetId}.wav`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, audioBlob);
  return path;
}

export async function getAudioFileUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return await getDownloadURL(storageRef);
}

export async function deleteAudioFile(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  try {
    await deleteObject(storageRef);
  } catch (err) {
    console.warn(`[premiumAudioStorageApi] Failed to delete audio file at ${storagePath}:`, err);
  }
}

export async function cleanupLessonAudioStorage(userId: string, lessonId: string): Promise<void> {
  const dirPath = `users/${userId}/lessons/${lessonId}/premium-audio`;
  const dirRef = ref(storage, dirPath);
  try {
    const listResult = await listAll(dirRef);
    const deletePromises = listResult.items.map((item) => deleteObject(item));
    await Promise.all(deletePromises);
  } catch (err) {
    // If the folder is empty or doesn't exist, listAll can fail/return empty, which is fine
    console.log(`[premiumAudioStorageApi] Cleanup storage completed for lesson ${lessonId}.`);
  }
}
