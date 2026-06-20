import React from 'react';

interface BrowserVoiceSettingsProps {
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
}

export const BrowserVoiceSettings: React.FC<BrowserVoiceSettingsProps> = ({
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
}) => {
  return (
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
  );
};
