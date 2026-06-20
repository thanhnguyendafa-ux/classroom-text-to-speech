import React from 'react';

interface AutoAdvanceSettingsProps {
  autoAdvance: boolean;
  setAutoAdvance: (val: boolean) => void;
  timeBetweenLines: number;
  setTimeBetweenLines: (val: number) => void;
  onApplyDelayToAll: () => void;
  playlistLoopMode: 'once' | 'infinite';
  handlePlaylistLoopModeChange: (mode: 'once' | 'infinite') => void;
}

export const AutoAdvanceSettings: React.FC<AutoAdvanceSettingsProps> = ({
  autoAdvance,
  setAutoAdvance,
  timeBetweenLines,
  setTimeBetweenLines,
  onApplyDelayToAll,
  playlistLoopMode,
  handlePlaylistLoopModeChange,
}) => {
  return (
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
  );
};
