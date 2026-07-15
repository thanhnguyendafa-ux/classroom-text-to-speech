export function normalizePremiumTtsError(errDesc: string, status?: number): string {
  if (!errDesc) {
    return status ? `Lỗi kết nối máy chủ (Mã: ${status})` : 'Đã xảy ra lỗi không xác định khi tạo giọng đọc Premium.';
  }

  const lowerErr = errDesc.toLowerCase();
  if (
    lowerErr.includes('api_key_invalid') ||
    lowerErr.includes('invalid api key') ||
    lowerErr.includes('key is not valid') ||
    lowerErr.includes('api key not valid') ||
    lowerErr.includes('invalid argument') ||
    status === 400
  ) {
    return 'Key không hợp lệ hoặc hết quota (Vui lòng kiểm tra lại Gemini API Key của bạn)';
  } else if (lowerErr.includes('quota') || lowerErr.includes('limit') || status === 429) {
    return 'Tài khoản hết quota hoặc bị giới hạn lượt gọi từ Gemini API.';
  } else if (lowerErr.includes('model') || lowerErr.includes('not found') || lowerErr.includes('unavailable')) {
    return 'Model Gemini TTS không khả dụng hoặc đã đổi tên trên hệ thống Google.';
  }
  return errDesc;
}

export interface GenerateTtsParams {
  text: string;
  voice: string;
  lang: string;
  apiKey: string;
}

export async function generatePremiumTts({
  text,
  voice,
  lang,
  apiKey,
}: GenerateTtsParams): Promise<string> {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('Chưa nhập Gemini API key. Vui lòng tự nhập Gemini API Key của bạn để sử dụng giọng đọc Premium AI.');
  }

  if (!text || !text.trim()) {
    throw new Error('Nội dung văn bản trống.');
  }

  const response = await authenticatedFetch('/api/tts', {
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
    throw new Error(normalizePremiumTtsError(errDesc, response.status));
  }

  const data = await response.json();
  if (!data.audioUrl) {
    throw new Error('Máy chủ không trả về liên kết âm thanh.');
  }

  return data.audioUrl;
}
import { authenticatedFetch } from '../../lib/firebase/authenticatedFetch';
