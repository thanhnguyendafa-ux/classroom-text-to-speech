import { cleanupLessonAudioAssets } from '../../features/premium-tts/persistent-audio/premiumAudioManifestApi';
import { cleanupLessonAudioStorage } from '../../features/premium-tts/persistent-audio/premiumAudioStorageApi';

export function cleanupLessonAudio(userId: string, lessonId: string): Promise<PromiseSettledResult<void>[]> {
  return Promise.allSettled([
    cleanupLessonAudioAssets(userId, lessonId),
    cleanupLessonAudioStorage(userId, lessonId),
  ]);
}
