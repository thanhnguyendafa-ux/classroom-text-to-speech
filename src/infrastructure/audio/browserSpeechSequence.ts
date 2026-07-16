import type { SpeechItem } from "../../types";

export interface BrowserSpeechSequenceInput {
  items: readonly SpeechItem[];
  speed: number;
  volume: number;
  voices: readonly SpeechSynthesisVoice[];
  preferredVoiceNames: Partial<Record<string, string>>;
  speechSynthesis: Pick<SpeechSynthesis, "speak" | "cancel">;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  wait: (callback: () => void, delayMs: number) => unknown;
  isCancelled: () => boolean;
  defaultPauseSeconds: number;
  onProgress?: (index: number, item: SpeechItem) => void;
  onRepeat?: (index: number, repeat: number, total: number) => void;
  onError?: (index: number, error: string) => void;
  onExpectationChange?: (expecting: boolean) => void;
  onUtterance?: (utterance: SpeechSynthesisUtterance) => void;
}

const langMap: Record<string, string> = { en: "en-US", vi: "vi-VN", "zh-cn": "zh-CN", "zh-tw": "zh-TW", ja: "ja-JP", ko: "ko-KR" };
const voicePrefix = (lang: string) => lang === "vi" ? "vi" : lang.startsWith("zh") ? "zh" : lang;

export function runBrowserSpeechSequence(input: BrowserSpeechSequenceInput): Promise<void> {
  return new Promise(resolve => {
    let index = 0;
    const playNext = () => {
      if (input.isCancelled()) return resolve();
      if (index >= input.items.length) return resolve();
      const itemIndex = index;
      const item = input.items[itemIndex];
      input.onProgress?.(itemIndex, item);
      const lang = item.selectedLang === "auto" ? item.detectedLang : item.selectedLang;
      const pauseMs = Math.max(0, (item.delaySec ?? input.defaultPauseSeconds) * 1000);
      const repeats = Number.isFinite(item.repeats) && item.repeats > 0 ? Math.floor(item.repeats) : 1;
      let repeat = 1;
      const speak = () => {
        if (input.isCancelled()) return resolve();
        const utterance = input.createUtterance(item.text);
        input.onUtterance?.(utterance);
        utterance.rate = item.speed ?? input.speed;
        utterance.volume = Math.min(1, input.volume);
        utterance.lang = langMap[lang] ?? "en-US";
        const preferred = input.preferredVoiceNames[lang];
        const voice = (preferred && input.voices.find(candidate => candidate.name === preferred)) ?? input.voices.find(candidate => candidate.lang.toLowerCase().replace("_", "-").startsWith(voicePrefix(lang)));
        if (voice) utterance.voice = voice;
        utterance.onstart = () => input.onExpectationChange?.(true);
        utterance.onend = () => {
          input.onExpectationChange?.(false);
          if (input.isCancelled()) return resolve();
          if (repeat < repeats) { repeat += 1; input.onRepeat?.(itemIndex, repeat, repeats); input.wait(speak, pauseMs); return; }
          index += 1; input.wait(playNext, pauseMs * 1.05);
        };
        utterance.onerror = event => { input.onExpectationChange?.(false); input.onError?.(itemIndex, event.error); index += 1; input.wait(playNext, 1000); };
        input.speechSynthesis.speak(utterance);
      };
      speak();
    };
    playNext();
  });
}

