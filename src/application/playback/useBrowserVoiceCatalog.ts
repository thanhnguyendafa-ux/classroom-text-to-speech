import { useEffect, useState } from "react";
import type { createWindowBrowserSpeechAdapter } from "../../features/playback/browserSpeechAdapter";
import { selectBrowserVoiceDefaults } from "./browserVoiceCatalog";
import type { BrowserVoicePreferences } from "./playbackOrchestrator";

type BrowserSpeechAdapter = ReturnType<typeof createWindowBrowserSpeechAdapter>;

type Input = { adapter: BrowserSpeechAdapter; preferences: BrowserVoicePreferences; onDefaultsChanged: (preferences: BrowserVoicePreferences) => void };

export function useBrowserVoiceCatalog(input: Input): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const refresh = () => {
      const available = input.adapter.getVoices();
      setVoices(available);
      const defaults = selectBrowserVoiceDefaults(available, input.preferences);
      if (Object.keys(defaults).some((key) => defaults[key as keyof BrowserVoicePreferences] !== input.preferences[key as keyof BrowserVoicePreferences])) input.onDefaultsChanged(defaults);
    };
    refresh();
    return input.adapter.subscribeToVoiceChanges(refresh);
  }, [input.adapter, input.preferences, input.onDefaultsChanged]);
  return voices;
}
