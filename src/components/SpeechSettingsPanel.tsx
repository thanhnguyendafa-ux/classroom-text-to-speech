import React from 'react';
import { Sliders, Sparkles, Monitor } from 'lucide-react';
import { PremiumEngineSection } from '../features/premium-tts/PremiumEngineSection';

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
        {/* Engine Mode Segmented Control */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-tight">CÔNG NGHỆ VOICE CHỌN:</span>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setEngineMode('browser')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                engineMode === 'browser'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1">🌐 Trình duyệt</span>
              <span className="text-[9px] text-slate-400 font-normal">Tốc độ cao, offline</span>
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('premium')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                engineMode === 'premium'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1">💎 Giọng Premium AI</span>
              <span className="text-[9px] text-indigo-200/90 font-normal font-sans">Dùng Gemini API key của bạn</span>
            </button>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* 1. Speech Speed Slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Tốc độ giọng nói (Speed):</span>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{speed.toFixed(1)}x</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400">Chậm (0.5)</span>
            <input
              id="speed-input-slider"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">Nhanh (2.0)</span>
          </div>
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={onApplySpeedToAll}
              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 py-1 rounded hover:bg-indigo-100 transition duration-150 cursor-pointer w-full text-center"
              title="Áp dụng tốc độ này cho toàn bộ các dòng hiện tại"
            >
              ⚡ Áp dụng tốc độ này cho tất cả câu
            </button>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Speech Volume Slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Âm lượng đọc (Volume):</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded transition-all duration-300 ${
              volume > 1.1 
                ? 'text-rose-600 bg-rose-50 ring-1 ring-rose-250 animate-pulse' 
                : volume > 1.0 
                  ? 'text-amber-600 bg-amber-50 ring-1 ring-amber-200' 
                  : 'text-indigo-600 bg-indigo-50'
            }`}>
              {Math.round(volume * 100)}% {volume > 1.0 && '🚀 Booster'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400">Tắt (0%)</span>
            <input
              id="volume-input-slider"
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">Cực đại (200%)</span>
          </div>
          {volume > 1.0 && (
            <p className="text-[9px] text-rose-500 font-medium mt-1 leading-relaxed">
              💡 Mẹo: Âm lượng &gt; 100% (Khuyếch đại Web Audio) hoạt động tối ưu nhất với giọng Premium (Gemini API).
            </p>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* 2. Auto Advance Configuration (Auto chuyển dòng) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 block text-left">Tự động chuyển dòng kế tiếp</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium text-left">Bật để nói liên tục từ trên xuống</span>
            </div>
            
            {/* Switch Toggle */}
            <button
              id="auto-advance-toggle"
              type="button"
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                autoAdvance ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  autoAdvance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {autoAdvance && (
            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between mb-1.5 text-xs">
                <span className="font-semibold text-slate-700">Thời gian nghỉ mặc định:</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{timeBetweenLines} giây</span>
              </div>
              <input
                id="time-between-input"
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={timeBetweenLines}
                onChange={(e) => setTimeBetweenLines(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-1 bg-white rounded-lg border border-slate-200 cursor-pointer"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={onApplyDelayToAll}
                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100 transition duration-150 cursor-pointer w-full text-center"
                  title="Áp dụng thời gian nghỉ này cho toàn bộ các dòng hiện tại"
                >
                  ⚡ Áp dụng thời gian nghỉ này cho tất cả câu
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block mt-2 text-left leading-relaxed">
                * Bạn cũng có thể điều chỉnh thời gian nghỉ riêng biệt từng câu trực tiếp trên từng thẻ dòng!
              </span>

              {/* Chế độ lặp lại toàn bộ chuỗi */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 block mb-1.5 uppercase tracking-wide text-left">Khi đọc xong tất cả các câu:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlaylistLoopModeChange('once')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                      playlistLoopMode === 'once'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🎯 Phát 1 lần rồi dừng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlaylistLoopModeChange('infinite')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                      playlistLoopMode === 'infinite'
                        ? 'bg-amber-50 border-amber-200 text-amber-705 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🔁 Lặp lại vô hạn chuỗi</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* 3. Favorite Preferred Voice Mappings (Conditional logic on mode selection) */}
        <div className="space-y-4">
          {engineMode === 'browser' ? (
            <>
              <div className="text-left">
                <label htmlFor="en-voice-fav" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  🇺🇸 Giọng English ưu tiên (Browser's engine)
                </label>
                <select
                  id="en-voice-fav"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
                  value={selectedEnVoiceName}
                  onChange={(e) => setSelectedEnVoiceName(e.target.value)}
                >
                  {englishVoices.length === 0 ? (
                    <option value="">-- Dùng English mặc định máy --</option>
                  ) : (
                    englishVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.localService ? '(Sẵn trong máy)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-left">
                <label htmlFor="vi-voice-fav" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  🇻🇳 Giọng Tiếng Việt ưu tiên (Browser's engine)
                </label>
                <select
                  id="vi-voice-fav"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
                  value={selectedViVoiceName}
                  onChange={(e) => setSelectedViVoiceName(e.target.value)}
                >
                  {vietnameseVoices.length === 0 ? (
                    <option value="">-- Dùng Tiếng Việt mặc định máy --</option>
                  ) : (
                    vietnameseVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.localService ? '(Sẵn trong máy)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-left">
                <label htmlFor="zh-cn-voice-fav" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  🇨🇳 Giọng ZH-CN ưu tiên (Browser's engine)
                </label>
                <select
                  id="zh-cn-voice-fav"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
                  value={selectedZhCnVoiceName}
                  onChange={(e) => setSelectedZhCnVoiceName(e.target.value)}
                >
                  {zhCnVoices.length === 0 ? (
                    <option value="">-- Dùng ZH-CN mặc định máy --</option>
                  ) : (
                    zhCnVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.localService ? '(Sẵn trong máy)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-left">
                <label htmlFor="zh-tw-voice-fav" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  🇭🇰 Giọng ZH-TW ưu tiên (Browser's engine)
                </label>
                <select
                  id="zh-tw-voice-fav"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
                  value={selectedZhTwVoiceName}
                  onChange={(e) => setSelectedZhTwVoiceName(e.target.value)}
                >
                  {zhTwVoices.length === 0 ? (
                    <option value="">-- Dùng ZH-TW mặc định máy --</option>
                  ) : (
                    zhTwVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.localService ? '(Sẵn trong máy)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-left">
                <label htmlFor="ja-voice-fav" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  🇯🇵 Giọng Tiếng Nhật ưu tiên (Browser's engine)
                </label>
                <select
                  id="ja-voice-fav"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
                  value={selectedJaVoiceName}
                  onChange={(e) => setSelectedJaVoiceName(e.target.value)}
                >
                  {japaneseVoices.length === 0 ? (
                    <option value="">-- Dùng Tiếng Nhật mặc định máy --</option>
                  ) : (
                    japaneseVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.localService ? '(Sẵn trong máy)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-left">
                <label htmlFor="ko-voice-fav" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  🇰🇷 Giọng Tiếng Hàn ưu tiên (Browser's engine)
                </label>
                <select
                  id="ko-voice-fav"
                  className="w-full text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors"
                  value={selectedKoVoiceName}
                  onChange={(e) => setSelectedKoVoiceName(e.target.value)}
                >
                  {koreanVoices.length === 0 ? (
                    <option value="">-- Dùng Tiếng Hàn mặc định máy --</option>
                  ) : (
                    koreanVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.localService ? '(Sẵn trong máy)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
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
