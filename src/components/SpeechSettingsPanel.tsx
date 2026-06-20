import React from 'react';
import { Sliders } from 'lucide-react';
import { PremiumEngineSection } from '../features/premium-tts/PremiumEngineSection';
import { EngineModeSelector } from './EngineModeSelector';
import { SpeedVolumeControls } from './SpeedVolumeControls';
import { AutoAdvanceSettings } from './AutoAdvanceSettings';
import { BrowserVoiceSettings } from './BrowserVoiceSettings';

interface SpeechSettingsPanelProps {
  engineMode: 'browser' | 'premium';
  setEngineMode: (mode: 'browser' | 'premium') => void;
  speed: number;
  setSpeed: (speed: number) => void;
  onApplySpeedToAll: () => void;
  volume: number;
  handleVolumeChange: (vol: number) => void;
  autoAdvance: boolean;
  setAutoAdvance: (val: boolean) => void;
  timeBetweenLines: number;
  setTimeBetweenLines: (val: number) => void;
  onApplyDelayToAll: () => void;
  playlistLoopMode: 'once' | 'infinite';
  handlePlaylistLoopModeChange: (mode: 'once' | 'infinite') => void;
  
  // Browser native fallback state
  selectedEnVoiceName: string;
  setSelectedEnVoiceName: (val: string) => void;
  selectedViVoiceName: string;
  setSelectedViVoiceName: (val: string) => void;
  selectedZhCnVoiceName: string;
  setSelectedZhCnVoiceName: (val: string) => void;
  selectedZhTwVoiceName: string;
  setSelectedZhTwVoiceName: (val: string) => void;
  selectedJaVoiceName: string;
  setSelectedJaVoiceName: (val: string) => void;
  selectedKoVoiceName: string;
  setSelectedKoVoiceName: (val: string) => void;
  
  englishVoices: SpeechSynthesisVoice[];
  vietnameseVoices: SpeechSynthesisVoice[];
  zhCnVoices: SpeechSynthesisVoice[];
  zhTwVoices: SpeechSynthesisVoice[];
  japaneseVoices: SpeechSynthesisVoice[];
  koreanVoices: SpeechSynthesisVoice[];
  
  // Premium Engine parameters
  userGeminiApiKey: string;
  showApiKey: boolean;
  setShowApiKey: (val: boolean) => void;
  handleApiKeyChange: (val: string) => void;
  clearApiKey: () => void;
  selectedPremiumVoices: {
    en: string;
    vi: string;
    'zh-cn': string;
    'zh-tw': string;
    ja: string;
    ko: string;
  };
  onVoiceChange: (lang: string, value: string) => void;
}

export const SpeechSettingsPanel: React.FC<SpeechSettingsPanelProps> = ({
  engineMode,
  setEngineMode,
  speed,
  setSpeed,
  onApplySpeedToAll,
  volume,
  handleVolumeChange,
  autoAdvance,
  setAutoAdvance,
  timeBetweenLines,
  setTimeBetweenLines,
  onApplyDelayToAll,
  playlistLoopMode,
  handlePlaylistLoopModeChange,
  
  selectedEnVoiceName,
  setSelectedEnVoiceName,
  selectedViVoiceName,
  setSelectedViVoiceName,
  selectedZhCnVoiceName,
  setSelectedZhCnVoiceName,
  selectedZhTwVoiceName,
  setSelectedZhTwVoiceName,
  selectedJaVoiceName,
  setSelectedJaVoiceName,
  selectedKoVoiceName,
  setSelectedKoVoiceName,
  
  englishVoices,
  vietnameseVoices,
  zhCnVoices,
  zhTwVoices,
  japaneseVoices,
  koreanVoices,
  
  userGeminiApiKey,
  showApiKey,
  setShowApiKey,
  handleApiKeyChange,
  clearApiKey,
  selectedPremiumVoices,
  onVoiceChange,
}) => {
  return (
    <div id="audio-settings-box" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Sliders className="w-4.5 h-4.5 text-indigo-600" />
          Cấu hình giọng đọc & Chuyển câu
        </h3>
      </div>

      <div className="space-y-4">
        <EngineModeSelector engineMode={engineMode} setEngineMode={setEngineMode} />

        <hr className="border-slate-100" />

        <SpeedVolumeControls
          speed={speed}
          setSpeed={setSpeed}
          onApplySpeedToAll={onApplySpeedToAll}
          volume={volume}
          handleVolumeChange={handleVolumeChange}
        />

        <hr className="border-slate-100" />

        <AutoAdvanceSettings
          autoAdvance={autoAdvance}
          setAutoAdvance={setAutoAdvance}
          timeBetweenLines={timeBetweenLines}
          setTimeBetweenLines={setTimeBetweenLines}
          onApplyDelayToAll={onApplyDelayToAll}
          playlistLoopMode={playlistLoopMode}
          handlePlaylistLoopModeChange={handlePlaylistLoopModeChange}
        />

        <hr className="border-slate-100" />

        <div className="space-y-4">
          {engineMode === 'browser' ? (
            <BrowserVoiceSettings
              selectedEnVoiceName={selectedEnVoiceName}
              setSelectedEnVoiceName={setSelectedEnVoiceName}
              selectedViVoiceName={selectedViVoiceName}
              setSelectedViVoiceName={setSelectedViVoiceName}
              selectedZhCnVoiceName={selectedZhCnVoiceName}
              setSelectedZhCnVoiceName={setSelectedZhCnVoiceName}
              selectedZhTwVoiceName={selectedZhTwVoiceName}
              setSelectedZhTwVoiceName={setSelectedZhTwVoiceName}
              selectedJaVoiceName={selectedJaVoiceName}
              setSelectedJaVoiceName={setSelectedJaVoiceName}
              selectedKoVoiceName={selectedKoVoiceName}
              setSelectedKoVoiceName={setSelectedKoVoiceName}
              englishVoices={englishVoices}
              vietnameseVoices={vietnameseVoices}
              zhCnVoices={zhCnVoices}
              zhTwVoices={zhTwVoices}
              japaneseVoices={japaneseVoices}
              koreanVoices={koreanVoices}
            />
          ) : (
            <PremiumEngineSection
              apiKey={userGeminiApiKey}
              showApiKey={showApiKey}
              setShowApiKey={setShowApiKey}
              setApiKey={handleApiKeyChange}
              clearApiKey={clearApiKey}
              selectedVoices={selectedPremiumVoices}
              onVoiceChange={onVoiceChange}
            />
          )}
        </div>

      </div>
    </div>
  );
};
