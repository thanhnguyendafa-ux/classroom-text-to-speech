/**
 * Define the structural interfaces for our text elements and voice profiles.
 */

export type LanguageCode = 'en' | 'vi' | 'zh-cn' | 'zh-tw' | 'ja' | 'ko';

export interface SpeechItem {
  id: string;
  text: string;
  detectedLang: LanguageCode;
  selectedLang: LanguageCode | 'auto';
  resolvedLang: LanguageCode;
  repeats: number; // Number of times to repeat this line
  delaySec?: number; // High-precision pause wait time in seconds (e.g. 1.5, 3)
  speed?: number; // Multiplier speed rate (e.g. 0.3, 0.4 ... up to 1.5)
}

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isLocal: boolean;
  isDefault: boolean;
}

export interface ActiveSpeechState {
  itemId: string | null;
  isPlaying: boolean;
  progressPercent: number; // For visualization
}
