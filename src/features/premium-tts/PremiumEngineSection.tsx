import React from 'react';
import { PremiumKeyPanel } from './PremiumKeyPanel';
import { PremiumVoiceSettings } from './PremiumVoiceSettings';

interface PremiumEngineSectionProps {
  apiKey: string;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  selectedVoices: {
    en: string;
    vi: string;
    'zh-cn': string;
    'zh-tw': string;
    ja: string;
    ko: string;
  };
  onVoiceChange: (lang: string, value: string) => void;
}

export const PremiumEngineSection: React.FC<PremiumEngineSectionProps> = ({
  apiKey,
  showApiKey,
  setShowApiKey,
  setApiKey,
  clearApiKey,
  selectedVoices,
  onVoiceChange,
}) => {
  return (
    <div id="premium-engine-section" className="space-y-4 animate-fade-in text-left">
      <PremiumKeyPanel
        apiKey={apiKey}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        setApiKey={setApiKey}
        clearApiKey={clearApiKey}
      />
      <PremiumVoiceSettings
        selectedVoices={selectedVoices}
        onVoiceChange={onVoiceChange}
      />
    </div>
  );
};
export default PremiumEngineSection;
