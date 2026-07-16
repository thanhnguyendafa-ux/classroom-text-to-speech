import type { LanguageCode, SpeechItem } from '../../types';
import { getPremiumVoiceForLang } from '../../features/premium-tts/premiumVoices';
import { resolvePremiumAudio } from '../../features/premium-tts/persistent-audio/premiumAudioResolver';
import { errorMessage } from '../../features/media-capture/mediaCaptureAdapter';
import { PremiumAudioExportCancelledError } from '../../infrastructure/audio/premiumAudioExportStrategy';
import { executePremiumAudioExport } from './executePremiumAudioExport';

type Phase = 'idle' | 'processing' | 'recording' | 'success' | 'error';
type PremiumVoices = Record<LanguageCode, string>;

interface PremiumExportActionInput {
  items: readonly SpeechItem[];
  defaultPauseSeconds: number;
  apiKey: string;
  voices: PremiumVoices;
  userId: string | null;
  lessonId: string | null;
  isCancelled: () => boolean;
  markRunning: () => void;
  clearLogs: () => void;
  replaceResultUrl: (url: string | null) => void;
  setPhase: (phase: Phase) => void;
  setProgress: (percent: number) => void;
  setProgressText: (text: string) => void;
  addLog: (message: string) => void;
}

function extractPcm(dataUrl: string) {
  const base64 = dataUrl.split(',')[1];
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const pcmBytes = bytes.slice(44);
  return new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.length / 2);
}

export async function runPremiumExportAction(input: PremiumExportActionInput) {
  input.markRunning();
  input.setPhase('processing');
  input.clearLogs();
  input.replaceResultUrl(null);
  input.setProgress(0);
  input.addLog(`Bắt đầu xử lý ${input.items.length} câu bằng Premium Voice.`);
  if (!input.apiKey.trim()) {
    input.setPhase('error');
    input.addLog('Thiếu Gemini API Key. Hãy cấu hình API key trước khi xuất Premium Voice.');
    return;
  }

  try {
    const url = await executePremiumAudioExport({
      items: input.items,
      defaultPauseSeconds: input.defaultPauseSeconds,
      apiKey: input.apiKey,
      isCancelled: input.isCancelled,
      onProgress: (completed, total, item) => {
        input.setProgress(Math.round((completed / total) * 80));
        input.setProgressText(`Đã tải giọng đọc câu ${completed}/${total}: "${item.text.substring(0, 40)}"`);
      },
      resolvePcm: async item => {
        const language = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
        const voice = getPremiumVoiceForLang(language, {
          selectedPremiumVoiceEn: input.voices.en,
          selectedPremiumVoiceVi: input.voices.vi,
          selectedPremiumVoiceZhCn: input.voices['zh-cn'],
          selectedPremiumVoiceZhTw: input.voices['zh-tw'],
          selectedPremiumVoiceJa: input.voices.ja,
          selectedPremiumVoiceKo: input.voices.ko,
        });
        input.addLog(`Gọi API [${language}]: "${item.text.substring(0, 30)}..."`);
        return extractPcm(await resolvePremiumAudio({ userId: input.userId, lessonId: input.lessonId, text: item.text, voice, lang: language, apiKey: input.apiKey, mode: 'prefer-saved' }));
      },
    });
    input.setProgress(90);
    input.setProgressText('Đang đóng gói WAV...');
    input.replaceResultUrl(url);
    input.setProgress(100);
    input.setPhase('success');
    input.addLog('Xuất file âm thanh thành công.');
  } catch (cause) {
    if (cause instanceof PremiumAudioExportCancelledError || input.isCancelled()) return;
    console.error('Premium audio export failed:', cause);
    input.setPhase('error');
    input.addLog(`Lỗi: ${errorMessage(cause) || 'Không thể tải giọng đọc AI.'}`);
  }
}
