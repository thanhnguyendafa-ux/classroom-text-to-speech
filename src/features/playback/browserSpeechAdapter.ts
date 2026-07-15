import { LanguageCode } from '../../types';

interface BrowserSpeechAdapterDependencies {
  synthesis: SpeechSynthesis;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
}

interface SpeakOptions {
  text: string;
  language: LanguageCode;
  speed: number;
  volume: number;
  preferredVoiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

const languageTags: Record<LanguageCode, string> = {
  en: 'en-US',
  vi: 'vi-VN',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

function languagePrefix(language: LanguageCode): string {
  return language.startsWith('zh') ? 'zh' : language;
}

export function createBrowserSpeechAdapter(dependencies: BrowserSpeechAdapterDependencies) {
  let activeUtterance: SpeechSynthesisUtterance | null = null;

  return {
    getVoices: () => dependencies.synthesis.getVoices(),
    subscribeToVoiceChanges(listener: () => void) {
      dependencies.synthesis.addEventListener('voiceschanged', listener);
      return () => dependencies.synthesis.removeEventListener('voiceschanged', listener);
    },
    speak(options: SpeakOptions) {
      const utterance = dependencies.createUtterance(options.text);
      activeUtterance = utterance;
      utterance.rate = options.speed;
      utterance.volume = Math.min(1, Math.max(0, options.volume));
      utterance.lang = languageTags[options.language];
      const voices = dependencies.synthesis.getVoices();
      utterance.voice = voices.find((voice) => voice.name === options.preferredVoiceName)
        ?? voices.find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(languagePrefix(options.language)))
        ?? null;
      utterance.onstart = options.onStart ?? null;
      utterance.onend = options.onEnd ?? null;
      utterance.onerror = options.onError ?? null;
      dependencies.synthesis.speak(utterance);
      return utterance;
    },
    pause() {
      dependencies.synthesis.pause();
    },
    resume() {
      dependencies.synthesis.resume();
    },
    stop() {
      dependencies.synthesis.cancel();
      activeUtterance = null;
    },
    getActiveUtterance: () => activeUtterance,
  };
}

export type BrowserSpeechAdapter = ReturnType<typeof createBrowserSpeechAdapter>;

export function createWindowBrowserSpeechAdapter(): BrowserSpeechAdapter | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return null;
  return createBrowserSpeechAdapter({
    synthesis: window.speechSynthesis,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
  });
}
