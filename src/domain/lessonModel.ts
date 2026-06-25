import {
  EngineMode,
  LanguageCode,
  LessonDocument,
  LessonDraft,
  LessonSettings,
  PlaylistLoopMode,
  RowLayoutMode,
  SharePlaylistPayload,
  SpeechItem,
} from '../types';

const VALID_LANGS: LanguageCode[] = ['en', 'vi', 'zh-cn', 'zh-tw', 'ja', 'ko'];

const isValidLang = (value: unknown): value is LanguageCode =>
  typeof value === 'string' && VALID_LANGS.includes(value as LanguageCode);

const clamp = (value: unknown, fallback: number, min: number, max: number) => {
  const numberValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, numberValue));
};

const stringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const boolValue = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

export function normalizeSpeechItem(input: unknown): SpeechItem {
  const item = input && typeof input === 'object' ? input as Record<string, unknown> : {};

  const text = stringValue(item.text).trim().slice(0, 1000);
  if (!text) {
    throw new Error('SpeechItem.text is required.');
  }

  const detectedLang = isValidLang(item.detectedLang) ? item.detectedLang : 'en';
  const selectedLang =
    item.selectedLang === 'auto' || isValidLang(item.selectedLang)
      ? item.selectedLang
      : 'auto';

  const resolvedLang = isValidLang(item.resolvedLang)
    ? item.resolvedLang
    : selectedLang === 'auto'
      ? detectedLang
      : selectedLang;

  const rawImageUrl = stringValue(item.imageUrl).trim();
  const imageUrl =
    rawImageUrl.startsWith('http://') ||
    rawImageUrl.startsWith('https://') ||
    rawImageUrl.startsWith('data:image/')
      ? rawImageUrl.slice(0, 1500)
      : undefined;

  return {
    id: stringValue(item.id, `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).slice(0, 80),
    text,
    detectedLang,
    selectedLang,
    resolvedLang,
    repeats: Math.floor(clamp(item.repeats, 1, 1, 10)),
    delaySec: clamp(item.delaySec ?? item.delay, 2, 0, 30),
    speed: clamp(item.speed, 1, 0.25, 3),
    setId: stringValue(item.setId).trim() || undefined,
    imageUrl,
  };
}

export function normalizeSpeechList(input: unknown): SpeechItem[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeSpeechItem).slice(0, 200);
}

export function normalizeLessonSettings(input: unknown): LessonSettings {
  const s = input && typeof input === 'object' ? input as Record<string, unknown> : {};

  const rowLayoutMode: RowLayoutMode = s.rowLayoutMode === 'side' ? 'side' : 'below';
  const engineMode: EngineMode = s.engineMode === 'premium' ? 'premium' : 'browser';

  return {
    speed: clamp(s.speed, 1, 0.25, 3),
    volume: clamp(s.volume, 1, 0, 2),
    autoAdvance: boolValue(s.autoAdvance, true),
    timeBetweenLines: clamp(s.timeBetweenLines, 2, 0, 30),
    rowLayoutMode,
    engineMode,

    selectedPremiumVoiceEn: stringValue(s.selectedPremiumVoiceEn, 'Zephyr'),
    selectedPremiumVoiceVi: stringValue(s.selectedPremiumVoiceVi, 'Kore'),
    selectedPremiumVoiceZhCn: stringValue(s.selectedPremiumVoiceZhCn, 'Kore'),
    selectedPremiumVoiceZhTw: stringValue(s.selectedPremiumVoiceZhTw, 'Zephyr'),
    selectedPremiumVoiceJa: stringValue(s.selectedPremiumVoiceJa, 'Zephyr'),
    selectedPremiumVoiceKo: stringValue(s.selectedPremiumVoiceKo, 'Kore'),

    selectedEnVoiceName: stringValue(s.selectedEnVoiceName),
    selectedViVoiceName: stringValue(s.selectedViVoiceName),
    selectedZhCnVoiceName: stringValue(s.selectedZhCnVoiceName),
    selectedZhTwVoiceName: stringValue(s.selectedZhTwVoiceName),
    selectedJaVoiceName: stringValue(s.selectedJaVoiceName),
    selectedKoVoiceName: stringValue(s.selectedKoVoiceName),

    autoGroupSet: boolValue(s.autoGroupSet, false),
    setMultiplier: Math.floor(clamp(s.setMultiplier, 1, 1, 20)),
    useUniversalImage: boolValue(s.useUniversalImage, false),
    universalImageUrl: stringValue(s.universalImageUrl),
  };
}

export function buildLessonDraft(input: {
  title: string;
  rawText: string;
  folderId?: string | null;
  speechList: SpeechItem[];
  settings: LessonSettings;
}): LessonDraft {
  return {
    title: input.title.trim(),
    rawText: input.rawText,
    folderId: input.folderId ?? null,
    speechList: normalizeSpeechList(input.speechList),
    settings: normalizeLessonSettings(input.settings),
  };
}

export function hydrateLessonDocument(id: string, input: unknown): LessonDocument {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const now = Date.now();

  return {
    schemaVersion: 1,
    id,
    title: stringValue(data.title, 'Bài học chưa đặt tên').trim(),
    rawText: stringValue(data.rawText),
    folderId: typeof data.folderId === 'string' ? data.folderId : null,
    speechList: normalizeSpeechList(data.speechList),
    settings: normalizeLessonSettings(data.settings),
    createdAt: clamp(data.createdAt, now, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: clamp(data.updatedAt, now, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function normalizeSharePlaylistPayload(input: unknown): SharePlaylistPayload {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const playlistLoopMode: PlaylistLoopMode = data.playlistLoopMode === 'infinite' ? 'infinite' : 'once';
  const engineMode: EngineMode = data.engineMode === 'premium' ? 'premium' : 'browser';

  return {
    speechList: normalizeSpeechList(data.speechList).slice(0, 100),
    speed: clamp(data.speed, 1, 0.25, 3),
    volume: clamp(data.volume, 1, 0, 2),
    autoAdvance: boolValue(data.autoAdvance, true),
    timeBetweenLines: clamp(data.timeBetweenLines, 0, 0, 30),
    playlistLoopMode,
    engineMode,
    createdAt: stringValue(data.createdAt) || undefined,
  };
}
