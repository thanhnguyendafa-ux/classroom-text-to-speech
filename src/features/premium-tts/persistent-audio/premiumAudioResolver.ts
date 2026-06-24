import { getLessonAudioAssets } from './premiumAudioManifestApi';
import { getAudioFileUrl } from './premiumAudioStorageApi';
import { getAudioCacheKey } from './premiumAudioKey';
import { premiumTtsCacheStore } from '../premiumTtsCacheStore';
import { PremiumAudioAsset } from './premiumAudioTypes';

export interface ResolvePremiumAudioParams {
  userId: string | null;
  lessonId: string | null;
  text: string;
  lang: string;
  voice: string;
  apiKey: string;
  mode: 'prefer-saved' | 'fallback-live' | 'only-ready';
  manifests?: PremiumAudioAsset[];
}

export async function resolvePremiumAudio({
  userId,
  lessonId,
  text,
  lang,
  voice,
  apiKey,
  mode,
  manifests
}: ResolvePremiumAudioParams): Promise<string> {
  const cacheKey = getAudioCacheKey(text, lang, voice);

  // 1. If user is authenticated and lesson is a cloud lesson, search in manifest
  if (userId && lessonId) {
    try {
      const assets = manifests || await getLessonAudioAssets(userId, lessonId);
      const matchingAsset = assets.find(a => a.cacheKey === cacheKey);
      
      if (matchingAsset && matchingAsset.status === 'ready' && matchingAsset.storagePath) {
        // Resolve URL from Firebase Storage
        const downloadUrl = await getAudioFileUrl(matchingAsset.storagePath);
        return downloadUrl;
      }
    } catch (err) {
      console.warn('[premiumAudioResolver] Failed to fetch manifest or storage download url:', err);
    }
  }

  // If we only allow ready audio files and it wasn't ready, throw an error
  if (mode === 'only-ready') {
    throw new Error('Audio chưa được chuẩn bị sẵn và chế độ chỉ cho phép phát audio đã tạo trước.');
  }

  // 2. Check RAM Cache / fallback to live generation
  return await premiumTtsCacheStore.getOrCreateAudioUrl({ text, lang, voice, apiKey });
}
