import React from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward, 
  X, 
  Film, 
  Tv, 
  Sliders, 
  Sparkles, 
  Timer, 
  Image as ImageIcon 
} from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';

interface TheaterPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  speechList: SpeechItem[];
  playingItemId: string | null;
  playingState: 'idle' | 'playing' | 'paused';
  currentRepeatIndex: number;
  waitingState: {
    isWaiting: boolean;
    remainingSec: number;
    itemId: string | null;
    type: 'repeat' | 'advance' | null;
  };
  volume: number;
  speed: number;
  onVolumeChange: (vol: number) => void;
  onSpeedChange: (speed: number) => void;
  onPlayItem: (item: SpeechItem) => void;
  onStop: () => void;
  timeBetweenLines: number;
  onTimeBetweenLinesChange: (time: number) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (val: boolean) => void;
  engineMode: 'browser' | 'premium';
}

export default function TheaterPlayer({
  isOpen,
  onClose,
  speechList,
  playingItemId,
  playingState,
  currentRepeatIndex,
  waitingState,
  volume,
  speed,
  onVolumeChange,
  onSpeedChange,
  onPlayItem,
  onStop,
  timeBetweenLines,
  onTimeBetweenLinesChange,
  autoAdvance,
  onAutoAdvanceChange,
  engineMode,
}: TheaterPlayerProps) {
  if (!isOpen) return null;

  // Find the currently active speech item
  const activeItem = speechList.find(item => item.id === playingItemId) || speechList[0];
  const activeIndex = speechList.findIndex(item => item.id === playingItemId);

  // Handle play previous
  const handlePrev = () => {
    if (speechList.length === 0) return;
    let targetIndex = activeIndex - 1;
    if (targetIndex < 0) {
      targetIndex = speechList.length - 1; // loop back to end
    }
    onPlayItem(speechList[targetIndex]);
  };

  // Handle play next
  const handleNext = () => {
    if (speechList.length === 0) return;
    let targetIndex = activeIndex + 1;
    if (targetIndex >= speechList.length) {
      targetIndex = 0; // loop back to start
    }
    onPlayItem(speechList[targetIndex]);
  };

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (playingState === 'playing') {
      onStop();
    } else {
      // Speak current active item or start first one
      onPlayItem(activeItem || speechList[0]);
    }
  };

  const isCurrentItemPlaying = playingItemId === activeItem?.id && playingState === 'playing';

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col md:flex-row font-sans text-slate-100">
      
      {/* LEFT SECTION: MAIN CINEMA STAGE & PLAYER SCREEN */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
        
        {/* Header Ribbon bar */}
        <div className="h-14 sm:h-16 px-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/90 z-20">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Film className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                Rạp Chiếu Luyện Tập <span className="text-[10px] bg-indigo-500/35 border border-indigo-500/50 text-indigo-200 font-bold px-2 py-0.5 rounded-full uppercase">Cinema Mode</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">Chế độ chiếu ảnh kèm phụ đề hỗ trợ nghe chép chính tả lớp học</p>
            </div>
          </div>

          <button
            onClick={() => {
              onStop();
              onClose();
            }}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-950 hover:border-rose-900 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
            title="Thoát chế độ rạp chiếu phim"
          >
            <X className="w-4 h-4 text-rose-500" />
            <span>Thoát Rạp Chiếu</span>
          </button>
        </div>

        {/* VIDEOTHEQUE CANVAS / VIEWPORT STAGE */}
        <div className="flex-1 relative flex items-center justify-center p-4 min-h-0 bg-slate-1000 z-10 select-none">
          {/* Blur background layer behind active slide image */}
          {activeItem?.imageUrl ? (
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <img 
                src={activeItem.imageUrl} 
                alt="blurred bg"
                className="w-full h-full object-cover blur-2xl opacity-20 scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}

          {/* Core Visual Stage Frame */}
          <div className="w-full max-w-4xl aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-900/60 relative flex flex-col items-center justify-center">
            
            {/* Slide screen area */}
            <div className="flex-1 w-full h-full relative flex items-center justify-center p-4">
              {activeItem?.imageUrl ? (
                /* Cinematic Image scale layer */
                <img
                  src={activeItem.imageUrl}
                  alt={activeItem.text}
                  className="max-w-full max-h-[75%] object-contain rounded-xl shadow-xl transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                /* Fallback screen: Solid slate-blue training wallpaper */
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-900 to-indigo-950 flex flex-col items-center justify-center p-10">
                  <div className="w-16 h-16 rounded-full bg-blue-600/35 border border-blue-400/30 flex items-center justify-center text-white/90 animate-pulse mb-4 z-10 shadow-xs">
                    <ImageIcon className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
                </div>
              )}

              {/* OVERLAY SUBTITLES FRAME */}
              <div className="absolute bottom-6 inset-x-4 text-center z-10 px-4">
                <div className="inline-block bg-black/60 backdrop-blur-md border border-white/5 py-3 px-6 sm:px-8 rounded-2xl max-w-3xl shadow-xl transition-all">
                  <span className="text-xl sm:text-3.5xl font-extrabold text-white text-center tracking-tight leading-normal drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] uppercase-none block">
                    {activeItem ? activeItem.text : "Chưa tải bài luyện"}
                  </span>
                  
                  {/* Local playing micro badges */}
                  {playingItemId === activeItem?.id && (
                    <div className="flex items-center justify-center space-x-1.5 mt-2 text-xs font-mono">
                      {waitingState.isWaiting ? (
                        <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">
                          ⏱️ {waitingState.type === 'repeat' ? 'Chờ lặp' : 'Chờ chuyển câu'}: {waitingState.remainingSec}s
                        </span>
                      ) : (
                        <span className="text-indigo-400 font-extrabold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-pulse uppercase text-[10px]">
                          🔊 Đang phát (Lần {currentRepeatIndex}/{activeItem.repeats || 1})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick floating indicators */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="bg-black/60 border border-white/10 text-slate-300 px-3 py-1 text-xs font-mono rounded-lg flex items-center gap-1.5 backdrop-blur-xs">
                {activeIndex !== -1 ? `${activeIndex + 1} / ${speechList.length}` : '—'}
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                activeItem?.resolvedLang === 'vi' 
                  ? 'bg-rose-600/80 border border-rose-500/50 text-white' 
                  : 'bg-indigo-650/80 border border-indigo-500/50 text-white'
              }`}>
                {activeItem?.resolvedLang === 'vi' ? '🇻🇳 VI Voice' : '🇺🇸 EN Voice'}
              </span>
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              {engineMode === 'premium' ? (
                <span className="bg-amber-600 border border-amber-500/40 text-white px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg animate-pulse">
                  💎 Active: Premium Voice (Gemini AI)
                </span>
              ) : (
                <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 text-[10px] font-semibold rounded-lg">
                  🌐 Active: Brower Engine
                </span>
              )}
            </div>

          </div>
        </div>

        {/* BOTTOM INTEGRATED CONTROLS PARAMETERS ROW */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-900 flex flex-col space-y-4 z-20">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Control Group 1: Navigation keys */}
            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <button
                onClick={handlePrev}
                disabled={speechList.length <= 1}
                className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Quay lại câu trước"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={speechList.length === 0}
                className={`p-4 rounded-full flex items-center justify-center transition-all ${
                  isCurrentItemPlaying
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10'
                } cursor-pointer`}
                title={isCurrentItemPlaying ? "Tạm ngưng giọng đọc" : "Bắt đầu phát âm"}
              >
                {isCurrentItemPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                disabled={speechList.length <= 1}
                className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Bỏ qua đến câu tiếp theo"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Control Group 2: Speeds, Autoplay, Staying time, Volume knobs */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 flex-1">
              
              {/* Autoplay Advance toggle */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tự chuyển tiếp</span>
                <button
                  type="button"
                  onClick={() => onAutoAdvanceChange(!autoAdvance)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoAdvance ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      autoAdvance ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Default Stay delay configuration */}
              {autoAdvance && (
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Timer className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Nghỉ giữa:</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.5"
                    className="accent-indigo-500 w-20 sm:w-24 h-1 bg-slate-800"
                    value={timeBetweenLines}
                    onChange={(e) => onTimeBetweenLinesChange(parseFloat(e.target.value))}
                  />
                  <span className="font-mono font-bold text-indigo-400">{timeBetweenLines}s</span>
                </div>
              )}

              {/* Speed dials */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2 text-xs">
                <div className="flex items-center gap-1 text-slate-400">
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Tốc độ:</span>
                </div>
                <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-850">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onSpeedChange(rate)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                        Math.abs(speed - rate) < 0.05
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-450 hover:text-slate-200'
                      }`}
                    >
                      {rate === 1.0 ? '1x' : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speaker Volume dials */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onVolumeChange(volume === 0 ? 1.0 : 0)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Tắt tiếng / Bật âm"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  className="accent-indigo-500 w-16 sm:w-20 h-1 bg-slate-800"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                />
                <span className="text-[10px] font-mono font-bold text-slate-400 w-8">{Math.round(volume * 100)}%</span>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR: EXQUISITE PLAYLIST COLUMN */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 bg-slate-900 overflow-y-auto shrink-0 flex flex-col h-1/3 md:h-full z-30">
        
        {/* Playlist Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
          <div className="text-left">
            <h3 className="font-extrabold text-sm text-white">Danh Sách Câu Huấn Luyện</h3>
            <p className="text-[10px] text-slate-400 mt-1">Phát lần lượt từ trên xuống dưới</p>
          </div>
          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded-full uppercase">
            {speechList.length} Câu
          </span>
        </div>

        {/* Scrollable listing */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {speechList.map((item, idx) => {
            const isPlaying = playingItemId === item.id;
            const hasCover = !!item.imageUrl;

            return (
              <button
                key={item.id}
                onClick={() => onPlayItem(item)}
                className={`w-full text-left p-2 rounded-xl transition flex items-center gap-3 border ${
                  isPlaying
                    ? 'bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500'
                    : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/50 hover:border-slate-800'
                } cursor-pointer group`}
              >
                {/* Image Thumb Thumbnail */}
                <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative shadow-3xs">
                  {hasCover ? (
                    <img
                      src={item.imageUrl}
                      alt="cover thumbnail"
                      className="w-full h-full object-cover transition group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    /* Default Blue frame */
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-950 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-extrabold text-white/90">
                        {idx + 1}
                      </span>
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-indigo-950/65 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    </div>
                  )}
                </div>

                {/* Subtitle wording detail */}
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-slate-400">
                      CÂU {idx + 1}
                    </span>
                    <span className={`text-[9px] font-extrabold rounded px-1 ${
                      item.resolvedLang === 'vi' 
                        ? 'bg-rose-950 border border-rose-900 text-rose-300' 
                        : 'bg-indigo-950 border border-indigo-900 text-indigo-300'
                    }`}>
                      {item.resolvedLang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 font-semibold truncate leading-tight ${
                    isPlaying ? 'text-indigo-200' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {item.text}
                  </p>
                </div>

                {/* Active Indicator Wave */}
                {isPlaying && (
                  <div className="flex items-end space-x-0.5 h-3 shrink-0 pr-1 select-none animate-pulse">
                    <span className="w-0.5 h-2.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-100"></span>
                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-300"></span>
                    <span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-0"></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
}
