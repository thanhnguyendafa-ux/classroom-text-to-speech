import type { BrowserVoicePreferences } from "./playbackOrchestrator";

const normalize = (value: string) => value.toLowerCase().replace("_", "-");
const find = (voices: SpeechSynthesisVoice[], exact: (lang: string) => boolean, fallback?: (lang: string) => boolean) => voices.find((voice) => exact(normalize(voice.lang))) ?? (fallback ? voices.find((voice) => fallback(normalize(voice.lang))) : undefined);

export function selectBrowserVoiceDefaults(voices: SpeechSynthesisVoice[], current: BrowserVoicePreferences): BrowserVoicePreferences {
  const selected = { ...current };
  if (!selected.en) selected.en = find(voices, (lang) => lang.includes("en-us"), (lang) => lang.startsWith("en"))?.name ?? "";
  if (!selected.vi) selected.vi = find(voices, (lang) => lang.includes("vi-vn"), (lang) => lang.startsWith("vi"))?.name ?? "";
  if (!selected["zh-cn"]) selected["zh-cn"] = find(voices, (lang) => lang.startsWith("zh-cn") || lang.startsWith("zh-chs"), (lang) => lang.startsWith("zh"))?.name ?? "";
  if (!selected["zh-tw"]) selected["zh-tw"] = find(voices, (lang) => lang.startsWith("zh-tw") || lang.startsWith("zh-hk") || lang.startsWith("zh-cht"))?.name ?? "";
  if (!selected.ja) selected.ja = find(voices, (lang) => lang.startsWith("ja"))?.name ?? "";
  if (!selected.ko) selected.ko = find(voices, (lang) => lang.startsWith("ko"))?.name ?? "";
  return selected;
}
