import { useState, useEffect } from 'react';
import { premiumTtsCacheStore, CacheStats } from './premiumTtsCacheStore';
import { GenerateTtsParams } from './premiumTtsClient';

export function usePremiumTtsCache() {
  const [stats, setStats] = useState<CacheStats>(() => premiumTtsCacheStore.getStats());

  useEffect(() => {
    const unsubscribe = premiumTtsCacheStore.subscribe(() => {
      setStats(premiumTtsCacheStore.getStats());
    });
    return unsubscribe;
  }, []);

  const getOrCreateAudioUrl = async (params: GenerateTtsParams): Promise<string> => {
    return premiumTtsCacheStore.getOrCreateAudioUrl(params);
  };

  const clearCache = () => {
    premiumTtsCacheStore.clear();
  };

  return {
    getOrCreateAudioUrl,
    clearCache,
    cacheStats: stats,
  };
}
