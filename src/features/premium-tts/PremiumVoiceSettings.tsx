import React, { useState } from 'react';
import { PREMIUM_VOICES } from './premiumVoices';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [expandedLangs, setExpandedLangs] = useState<Record<string, boolean>>({
    en: true,
    vi: true,
    'zh-cn': false,
    'zh-tw': false,
    ja: false,
    ko: false,
  });

  const languageKeys = Object.keys(PREMIUM_VOICES) as Array<keyof typeof PREMIUM_VOICES>;

  const toggleLang = (lang: string) => {
    setExpandedLangs((prev) => ({
      ...prev,
      [lang]: !prev[lang],
    }));
  };

  return (
    <div id="premium-voice-settings-group" className="space-y-3">
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

      <div className="space-y-2.5">
        {languageKeys.map((key) => {
          const config = PREMIUM_VOICES[key];
          const currentValue = selectedVoices[key] || config.defaultVoice;
          const isExpanded = expandedLangs[key];

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
            <div 
              key={key} 
              id={`premium-voice-select-container-${key}`} 
              className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-25/10 transition-shadow hover:shadow-2xs"
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleLang(key)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-indigo-50/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-base shrink-0 select-none">{config.flag}</span>
                  <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-tight truncate">
                    {key.toUpperCase()}: {config.langLabel.replace('Giọng Premium ', '').replace(' (Gemini AI)', '').replace(' (Gemini)', '')}
                  </span>
                  <span className="text-[9.5px] font-semibold font-mono text-indigo-750 bg-indigo-50/90 border border-indigo-150 px-1.5 py-0.2 rounded shrink-0">
                    {currentValue}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div id={`premium-voice-panel-${key}`} className="px-3 pb-3 border-t border-indigo-100/60 pt-2.5 space-y-1.5 bg-white">
                  <label 
                    htmlFor={`${key}-premium-voice`} 
                    className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center gap-1.5"
                  >
                    <span>Lựa chọn giọng cho {config.langLabel}</span> 
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded-xs">Giọng Mượt</span>
                  </label>
                  <select
                    id={`${key}-premium-voice`}
                    className="w-full text-xs font-sans bg-indigo-50/30 border border-indigo-150 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-indigo-50 transition-colors"
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
