import React from 'react';
import { PREMIUM_VOICES } from './premiumVoices';

interface PremiumVoiceSettingsProps {
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

export const PremiumVoiceSettings: React.FC<PremiumVoiceSettingsProps> = ({
  selectedVoices,
  onVoiceChange,
}) => {
  const languageKeys = Object.keys(PREMIUM_VOICES) as Array<keyof typeof PREMIUM_VOICES>;

  return (
    <div id="premium-voice-settings-group" className="space-y-4">
      {languageKeys.map((key) => {
        const config = PREMIUM_VOICES[key];
        const currentValue = selectedVoices[key] || config.defaultVoice;

        return (
          <div key={key} id={`premium-voice-select-${key}`} className="animate-fade-in text-left">
            <label 
              htmlFor={`${key}-premium-voice`} 
              className="text-[10px] font-bold text-indigo-600 uppercase block mb-1.5 flex items-center gap-1.5"
            >
              <span className="text-sm shrink-0">{config.flag}</span>
              <span>{config.langLabel}</span> 
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded-sm">Mượt</span>
            </label>
            <select
              id={`${key}-premium-voice`}
              className="w-full text-xs font-sans bg-indigo-50/50 border border-indigo-150 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-indigo-50 transition-colors"
              value={currentValue}
              onChange={(e) => onVoiceChange(key, e.target.value)}
            >
              {config.voices.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
};
