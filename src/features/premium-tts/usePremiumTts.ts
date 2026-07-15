import { useState } from 'react';
import { premiumTtsCacheStore } from './premiumTtsCacheStore';
import { errorMessage } from '../../lib/errorMessage';

export function usePremiumTts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTts = async (
    text: string,
    voice: string,
    lang: string,
    apiKey: string
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const audioUrl = await premiumTtsCacheStore.getOrCreateAudioUrl({ text, voice, lang, apiKey });
      return audioUrl;
    } catch (err: unknown) {
      const finalMsg = errorMessage(err, 'Đã xảy ra lỗi không xác định khi tạo giọng đọc Premium.');
      setError(finalMsg);
      throw new Error(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    generateTts,
    loading,
    error,
    setError,
  };
}
