import { useState, useEffect, useRef, useCallback } from 'react';
import { errorMessage } from '../../../lib/errorMessage';
import { SpeechItem } from '../../../types';
import { 
  PremiumAudioAsset, 
  PreparationProgress, 
  PremiumAudioStatus 
} from './premiumAudioTypes';
import { getAudioCacheKey, hashString } from './premiumAudioKey';
import { getPremiumVoiceForLang } from '../premiumVoices';
import { 
  getLessonAudioAssets, 
  savePremiumAudioAsset, 
  deletePremiumAudioAsset,
  cleanupLessonAudioAssets,
  updatePremiumAudioAssetStatus
} from './premiumAudioManifestApi';
import { 
  uploadAudioFile, 
  deleteAudioFile, 
  cleanupLessonAudioStorage 
} from './premiumAudioStorageApi';
import { generatePremiumTts } from '../premiumTtsClient';

export interface UsePremiumAudioPreparationProps {
  userId: string | null;
  lessonId: string | null;
  speechList: SpeechItem[];
  userGeminiApiKey: string;
  premiumVoiceSettings: {
    selectedPremiumVoiceEn: string;
    selectedPremiumVoiceVi: string;
    selectedPremiumVoiceZhCn: string;
    selectedPremiumVoiceZhTw: string;
    selectedPremiumVoiceJa: string;
    selectedPremiumVoiceKo: string;
  };
}

export function usePremiumAudioPreparation({
  userId,
  lessonId,
  speechList,
  userGeminiApiKey,
  premiumVoiceSettings
}: UsePremiumAudioPreparationProps) {
  const [manifests, setManifests] = useState<PremiumAudioAsset[]>([]);
  const [isLoadingManifest, setIsLoadingManifest] = useState<boolean>(false);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const shouldStopRef = useRef<boolean>(false);
  const isPreparingRef = useRef<boolean>(false);

  // Load manifests on mount or when userId/lessonId changes
  const loadManifests = useCallback(async () => {
    if (!userId || !lessonId) {
      setManifests([]);
      return;
    }
    setIsLoadingManifest(true);
    try {
      const assets = await getLessonAudioAssets(userId, lessonId);
      setManifests(assets);
    } catch (err) {
      console.error('[usePremiumAudioPreparation] Error loading manifests:', err);
    } finally {
      setIsLoadingManifest(false);
    }
  }, [userId, lessonId]);

  useEffect(() => {
    loadManifests();
  }, [loadManifests]);

  // Clean stop on unmount
  useEffect(() => {
    return () => {
      shouldStopRef.current = true;
    };
  }, []);

  // Helper: map a speech item to its parameters
  const getItemParams = useCallback((item: SpeechItem) => {
    const text = item.text.trim();
    if (!text) return null;

    const langCode = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
    const voice = getPremiumVoiceForLang(langCode, premiumVoiceSettings);
    const cacheKey = getAudioCacheKey(text, langCode, voice);
    const textHash = hashString(cacheKey);

    return {
      text,
      lang: langCode,
      voice,
      cacheKey,
      assetId: textHash,
      textPreview: text.substring(0, 80)
    };
  }, [premiumVoiceSettings]);

  // Derive list of unique non-empty items
  const uniqueItems = (() => {
    const seen = new Set<string>();
    const result: Array<{
      text: string;
      lang: string;
      voice: string;
      cacheKey: string;
      assetId: string;
      textPreview: string;
    }> = [];

    speechList.forEach(item => {
      const params = getItemParams(item);
      if (!params) return;

      if (!seen.has(params.cacheKey)) {
        seen.add(params.cacheKey);
        result.push(params);
      }
    });

    return result;
  })();

  // Compute stats
  const totalSpeechLinesCount = speechList.filter(item => item.text.trim().length > 0).length;
  const uniqueLinesCount = uniqueItems.length;
  const duplicateReusedCount = totalSpeechLinesCount - uniqueLinesCount;

  // Compute status map & counts based on manifests & unique items
  const progress: PreparationProgress = (() => {
    const statusMap: Record<string, PremiumAudioStatus | 'missing'> = {};
    let ready = 0;
    let failed = 0;
    let missing = 0;

    uniqueItems.forEach(item => {
      const asset = manifests.find(m => m.cacheKey === item.cacheKey);
      if (asset) {
        statusMap[item.cacheKey] = asset.status;
        if (asset.status === 'ready') ready++;
        else if (asset.status === 'failed') failed++;
        else missing++;
      } else {
        statusMap[item.cacheKey] = 'missing';
        missing++;
      }
    });

    // Quota saved is all duplicates/reused lines + unique lines already ready
    const quotaSaved = duplicateReusedCount + ready;

    return {
      total: uniqueLinesCount,
      ready,
      missing,
      failed,
      duplicateReused: duplicateReusedCount,
      quotaSaved,
      statusMap
    };
  })();

  // Stop generation
  const stopPreparation = useCallback(() => {
    shouldStopRef.current = true;
    setIsPreparing(false);
    isPreparingRef.current = false;
  }, []);

  // Start generation queue
  const startPreparation = useCallback(async () => {
    if (!userId || !lessonId) {
      setError('Lưu bài học trước khi tạo sẵn audio.');
      return;
    }
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setError('Thiếu Gemini API Key. Hãy kích hoạt ở bảng cấu hình bên trái.');
      return;
    }
    if (isPreparingRef.current) return;

    shouldStopRef.current = false;
    setIsPreparing(true);
    isPreparingRef.current = true;
    setError(null);

    // Filter items that need to be generated (missing or failed)
    const itemsToGenerate = uniqueItems.filter(item => {
      const status = progress.statusMap[item.cacheKey];
      return status === 'missing' || status === 'failed';
    });

    for (const item of itemsToGenerate) {
      if (shouldStopRef.current) {
        break;
      }

      // 1. Create/Update manifest as pending
      const now = Date.now();
      const pendingAsset: PremiumAudioAsset = {
        assetId: item.assetId,
        cacheKey: item.cacheKey,
        textHash: item.assetId,
        textPreview: item.textPreview,
        lang: item.lang,
        voice: item.voice,
        status: 'pending',
        storagePath: null,
        sourceVersion: 'premium-tts-v1',
        createdAt: now,
        updatedAt: now
      };

      // Pessimistically add or update in state
      setManifests(prev => {
        const filtered = prev.filter(m => m.assetId !== item.assetId);
        return [...filtered, pendingAsset];
      });

      try {
        await savePremiumAudioAsset(userId, lessonId, pendingAsset);

        // 2. Call TTS Generation client API
        const audioDataUrl = await generatePremiumTts({
          text: item.text,
          voice: item.voice,
          lang: item.lang,
          apiKey: userGeminiApiKey
        });

        // Convert base64 to Blob
        const resBlob = await fetch(audioDataUrl);
        const audioBlob = await resBlob.blob();

        // 3. Upload to Storage
        const storagePath = await uploadAudioFile(userId, lessonId, item.assetId, audioBlob);

        // 4. Update manifest as ready
        const readyAsset: PremiumAudioAsset = {
          ...pendingAsset,
          status: 'ready',
          storagePath,
          sizeBytes: audioBlob.size,
          updatedAt: Date.now()
        };

        await savePremiumAudioAsset(userId, lessonId, readyAsset);

        // Update state
        setManifests(prev => {
          const filtered = prev.filter(m => m.assetId !== item.assetId);
          return [...filtered, readyAsset];
        });

      } catch (err: unknown) {
        console.error('[usePremiumAudioPreparation] Generation failed for:', item.text, err);
        
        const failureMessage = errorMessage(err, '').toLowerCase();
        const isQuotaError = failureMessage.includes('quota') || failureMessage.includes('resource_exhausted');

        const failedAsset: PremiumAudioAsset = {
          ...pendingAsset,
          status: 'failed',
          errorCode: isQuotaError ? 'quota_exhausted' : 'generation_failed',
          errorMessage: errorMessage(err, 'Lỗi tạo audio'),
          updatedAt: Date.now()
        };

        try {
          await savePremiumAudioAsset(userId, lessonId, failedAsset);
        } catch (dbErr) {
          console.warn('[usePremiumAudioPreparation] Failed to save error manifest to db:', dbErr);
        }

        setManifests(prev => {
          const filtered = prev.filter(m => m.assetId !== item.assetId);
          return [...filtered, failedAsset];
        });

        if (isQuotaError) {
          setError('Đã hết quota Gemini API. Vui lòng thử lại vào hôm sau.');
          stopPreparation();
          break;
        }
      }
    }

    setIsPreparing(false);
    isPreparingRef.current = false;
  }, [userId, lessonId, uniqueItems, progress.statusMap, userGeminiApiKey, stopPreparation]);

  // Delete all prepared audio files & manifests
  const deletePreparedAudio = useCallback(async () => {
    if (!userId || !lessonId) return;
    setIsPreparing(false);
    isPreparingRef.current = false;
    shouldStopRef.current = true;

    try {
      // 1. Delete manifests in database
      await cleanupLessonAudioAssets(userId, lessonId);
      // 2. Delete storage files
      await cleanupLessonAudioStorage(userId, lessonId);
      // 3. Refresh
      setManifests([]);
      setError(null);
    } catch (err) {
      console.error('[usePremiumAudioPreparation] Error cleaning up audio:', err);
      setError('Có lỗi xảy ra khi dọn sạch audio.');
    }
  }, [userId, lessonId]);

  // Clean up unused audio (assets that exist in Firestore/Storage but are no longer in the speechList)
  const cleanUnusedAudio = useCallback(async () => {
    if (!userId || !lessonId) return;
    setIsPreparing(false);
    isPreparingRef.current = false;
    shouldStopRef.current = true;

    try {
      const activeCacheKeys = new Set(uniqueItems.map(item => item.cacheKey));
      const unusedAssets = manifests.filter(m => !activeCacheKeys.has(m.cacheKey));

      for (const asset of unusedAssets) {
        // Delete storage file
        if (asset.storagePath) {
          await deleteAudioFile(asset.storagePath);
        }
        // Delete manifest doc
        await deletePremiumAudioAsset(userId, lessonId, asset.assetId);
      }

      // Refresh manifests
      await loadManifests();
    } catch (err) {
      console.error('[usePremiumAudioPreparation] Error cleaning up unused audio:', err);
      setError('Có lỗi xảy ra khi dọn audio không còn dùng.');
    }
  }, [userId, lessonId, uniqueItems, manifests, loadManifests]);

  return {
    manifests,
    progress,
    isPreparing,
    isLoadingManifest,
    error,
    startPreparation,
    stopPreparation,
    deletePreparedAudio,
    cleanUnusedAudio,
    refreshManifests: loadManifests
  };
}
