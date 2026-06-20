import React, { useState } from 'react';
import { PREMIUM_VOICES } from './premiumVoices';
import { Search } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const languageKeys = Object.keys(PREMIUM_VOICES) as Array<keyof typeof PREMIUM_VOICES>;

  return (
    <div id="premium-voice-settings-group" className="space-y-4">
      {/* Voice search input */}
      <div className="relative animate-fade-in mb-3">
        <label htmlFor="premium-voice-search" className="sr-only">Tìm kiếm giọng đọc</label>
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-indigo-400">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          id="premium-voice-search"
          type="text"
          placeholder="Tìm giọng nhanh (ví dụ: Zephyr, mượt)..."
          className="w-full text-xs bg-indigo-50/40 border border-indigo-150 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-indigo-350 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-indigo-50 transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {languageKeys.map((key) => {
        const config = PREMIUM_VOICES[key];
        const currentValue = selectedVoices[key] || config.defaultVoice;

        // Filter voices based on search term (searching by voice name value or note)
        const query = searchTerm.trim().toLowerCase();
        const filteredVoices = config.voices.filter((v) => {
          if (!query) return true;
          return (
            v.value.toLowerCase().includes(query) ||
            (v.note && v.note.toLowerCase().includes(query))
          );
        });

        // Ensure the currently selected voice is always selectable even if it's filtered out
        const hasSelected = filteredVoices.some((v) => v.value === currentValue);
        const displayVoices = [...filteredVoices];
        if (!hasSelected) {
          const originalVoice = config.voices.find((v) => v.value === currentValue);
          if (originalVoice) {
            displayVoices.unshift(originalVoice);
          }
        }

        return (
          <div key={key} id={`premium-voice-select-${key}`} className="animate-fade-in text-left">
            <label 
              htmlFor={`${key}-premium-voice`} 
              className="text-[10px] font-bold text-indigo-600 uppercase block mb-1 flex items-center gap-1.5"
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
              {displayVoices.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}{v.note ? ` - ${v.note}` : ''}
                </option>
              ))}
              {displayVoices.length === 0 && (
                <option value="" disabled>Không tìm thấy kết quả phù hợp</option>
              )}
            </select>
          </div>
        );
      })}
    </div>
  );
};
