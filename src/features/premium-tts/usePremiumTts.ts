import { useState } from 'react';
import { generatePremiumTts } from './premiumTtsClient';

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
      const audioUrl = await generatePremiumTts({ text, voice, lang, apiKey });
      return audioUrl;
    } catch (err: any) {
      const finalMsg = err.message || 'Đã xảy ra lỗi không xác định khi tạo giọng đọc Premium.';
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
