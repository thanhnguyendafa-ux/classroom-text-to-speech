import React from 'react';

interface EngineModeSelectorProps {
  engineMode: 'browser' | 'premium';
  setEngineMode: (mode: 'browser' | 'premium') => void;
}

export const EngineModeSelector: React.FC<EngineModeSelectorProps> = ({
  engineMode,
  setEngineMode,
}) => {
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-tight">CÔNG NGHỆ VOICE CHỌN:</span>
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setEngineMode('browser')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            engineMode === 'browser'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
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
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1">💎 Giọng Premium AI</span>
          <span className="text-[9px] text-indigo-200/90 font-normal font-sans">Dùng Gemini API key của bạn</span>
        </button>
      </div>
    </div>
  );
};
