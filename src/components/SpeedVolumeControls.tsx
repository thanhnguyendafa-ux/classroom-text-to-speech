import React from 'react';

interface SpeedVolumeControlsProps {
  speed: number;
  setSpeed: (speed: number) => void;
  onApplySpeedToAll: () => void;
  volume: number;
  handleVolumeChange: (vol: number) => void;
}

export const SpeedVolumeControls: React.FC<SpeedVolumeControlsProps> = ({
  speed,
  setSpeed,
  onApplySpeedToAll,
  volume,
  handleVolumeChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Speech Speed Slider */}
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
    </div>
  );
};
