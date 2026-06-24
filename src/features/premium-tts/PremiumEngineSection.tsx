import React from 'react';
import { PremiumKeyPanel } from './PremiumKeyPanel';
import { PremiumVoiceSettings } from './PremiumVoiceSettings';
import { usePremiumTtsCache } from './usePremiumTtsCache';
import { Trash2, Database } from 'lucide-react';

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
  const { cacheStats, clearCache } = usePremiumTtsCache();

  return (
    <div id="premium-engine-section" className="space-y-4 animate-fade-in text-left">
      <PremiumKeyPanel
        apiKey={apiKey}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        setApiKey={setApiKey}
        clearApiKey={clearApiKey}
      />

      {/* Cache Status Panel */}
      <div id="premium-cache-panel" className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Bộ nhớ đệm giọng đọc (Cache)</span>
          </div>
          {cacheStats.cachedCount > 0 && (
            <button
              onClick={clearCache}
              type="button"
              className="text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors hover:underline cursor-pointer"
              title="Xóa tất cả âm thanh đã cache trong phiên này"
            >
              <Trash2 className="w-3 h-3" />
              Xóa cache
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9.5px] text-slate-400 font-medium uppercase tracking-tight">Đã tạo</span>
            <span className="text-xs font-bold text-slate-800">{cacheStats.cachedCount} đoạn</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-[9.5px] text-slate-400 font-medium uppercase tracking-tight">Dùng lại (Tiết kiệm)</span>
            <span className="text-xs font-bold text-emerald-600">+{cacheStats.hits} lần gọi AI</span>
          </div>
        </div>
        
        <p className="text-[9.5px] text-slate-400 leading-normal italic">
          * Đã tự động tối ưu hóa: Không gọi lại Gemini khi lặp dòng, nhân bản Set, lặp playlist, hoặc phát lại.
        </p>
      </div>

      <PremiumVoiceSettings
        selectedVoices={selectedVoices}
        onVoiceChange={onVoiceChange}
      />
    </div>
  );
};
export default PremiumEngineSection;
