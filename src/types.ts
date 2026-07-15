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
  setId?: string; // Optional ID grouping multiple items into a single bilingual set
  imageUrl?: string; // Associated image URL for display during theater play
}

export type EngineMode = 'browser' | 'premium';
export type RowLayoutMode = 'below' | 'side';
export type PlaylistLoopMode = 'once' | 'infinite';

export interface LessonSettings {
  speed: number;
  volume?: number;
  autoAdvance?: boolean;
  timeBetweenLines: number;
  rowLayoutMode: RowLayoutMode;
  engineMode: EngineMode;

  selectedPremiumVoiceEn: string;
  selectedPremiumVoiceVi: string;
  selectedPremiumVoiceZhCn: string;
  selectedPremiumVoiceZhTw: string;
  selectedPremiumVoiceJa: string;
  selectedPremiumVoiceKo: string;

  selectedEnVoiceName: string;
  selectedViVoiceName: string;
  selectedZhCnVoiceName: string;
  selectedZhTwVoiceName: string;
  selectedJaVoiceName: string;
  selectedKoVoiceName: string;

  autoGroupSet: boolean;
  setMultiplier: number;
  useUniversalImage: boolean;
  universalImageUrl: string;
}

export interface LessonDocument {
  schemaVersion: 1;
  revision: number;
  id: string;
  title: string;
  rawText: string;
  folderId: string | null;
  speechList: SpeechItem[];
  settings: LessonSettings;
  createdAt: number;
  updatedAt: number;
}

export interface LessonDraft {
  title: string;
  rawText: string;
  folderId: string | null;
  speechList: SpeechItem[];
  settings: LessonSettings;
}

export interface SharePlaylistPayload {
  speechList: SpeechItem[];
  speed: number;
  volume: number;
  autoAdvance: boolean;
  timeBetweenLines: number;
  playlistLoopMode: PlaylistLoopMode;
  engineMode: EngineMode;
  createdAt?: string;
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

