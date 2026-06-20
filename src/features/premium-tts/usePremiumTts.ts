import { useState } from 'react';

export function usePremiumTts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTts = async (
    text: string,
    voice: string,
    lang: string,
    apiKey: string
  ): Promise<string> => {
    const trimmedKey = (apiKey || '').trim();
    if (!trimmedKey) {
      const msg = 'Chưa nhập Gemini API key. Vui lòng tự nhập Gemini API Key của bạn để sử dụng giọng đọc Premium AI.';
      setError(msg);
      throw new Error(msg);
    }

    if (!text || !text.trim()) {
      throw new Error('Nội dung văn bản trống.');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: voice,
          lang: lang,
          userApiKey: trimmedKey,
        }),
      });

      if (!response.ok) {
        let errDesc = '';
        try {
          const errData = await response.json();
          errDesc = errData.error || errData.message || '';
        } catch {
          // ignore
        }

        if (!errDesc) {
          errDesc = `Lỗi kết nối máy chủ (Mã: ${response.status})`;
        }

        // Translate and refine common Gemini/API errors for users
        const lowerErr = errDesc.toLowerCase();
        if (
          lowerErr.includes('api_key_invalid') ||
          lowerErr.includes('invalid api key') ||
          lowerErr.includes('key is not valid') ||
          lowerErr.includes('api key not valid') ||
          lowerErr.includes('invalid argument') ||
          response.status === 400
        ) {
          errDesc = 'Key không hợp lệ hoặc hết quota (Vui lòng kiểm tra lại Gemini API Key của bạn)';
        } else if (lowerErr.includes('quota') || lowerErr.includes('limit') || response.status === 429) {
          errDesc = 'Tài khoản hết quota hoặc bị giới hạn lượt gọi từ Gemini API.';
        } else if (lowerErr.includes('model') || lowerErr.includes('not found') || lowerErr.includes('unavailable')) {
          errDesc = 'Model Gemini TTS không khả dụng hoặc đã đổi tên trên hệ thống Google.';
        }

        throw new Error(errDesc);
      }

      const data = await response.json();
      if (!data.audioUrl) {
        throw new Error('Máy chủ không trả về liên kết âm thanh.');
      }

      return data.audioUrl;
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
