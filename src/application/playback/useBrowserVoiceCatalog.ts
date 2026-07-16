import { useEffect, useRef, useState } from "react";
import { createWindowBrowserSpeechAdapter } from "../../features/playback/browserSpeechAdapter";
import { selectBrowserVoiceDefaults } from "./browserVoiceCatalog";
import type { BrowserVoicePreferences } from "./playbackOrchestrator";

type BrowserSpeechAdapter = ReturnType<typeof createWindowBrowserSpeechAdapter>;

type Input = { preferences: BrowserVoicePreferences; onDefaultsChanged: (preferences: BrowserVoicePreferences) => void };

export function useBrowserVoiceCatalog(input: Input): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const adapterRef = useRef<BrowserSpeechAdapter | null>(null);
  if (!adapterRef.current) adapterRef.current = createWindowBrowserSpeechAdapter();
  const adapter = adapterRef.current;
  useEffect(() => {
    const refresh = () => {
      const available = adapter.getVoices();
      setVoices(available);
      const defaults = selectBrowserVoiceDefaults(available, input.preferences);
      if (Object.keys(defaults).some((key) => defaults[key as keyof BrowserVoicePreferences] !== input.preferences[key as keyof BrowserVoicePreferences])) input.onDefaultsChanged(defaults);
    };
    refresh();
    return adapter.subscribeToVoiceChanges(refresh);
  }, [adapter, input.preferences, input.onDefaultsChanged]);
  return voices;
}
