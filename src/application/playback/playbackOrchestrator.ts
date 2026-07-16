import type { LanguageCode, PlaylistLoopMode, SpeechItem } from "../../types";

export type BrowserVoicePreferences = Record<LanguageCode, string>;

export function resolvePreferredBrowserVoiceName(language: LanguageCode, preferences: BrowserVoicePreferences): string {
  return preferences[language];
}

export function findNextPlaybackItem(list: SpeechItem[], currentId: string, loopMode: PlaylistLoopMode): SpeechItem | null {
  const currentIndex = list.findIndex((item) => item.id === currentId);
  if (currentIndex < 0) return null;
  if (currentIndex + 1 < list.length) return list[currentIndex + 1];
  return loopMode === "infinite" && list.length > 0 ? list[0] : null;
}
