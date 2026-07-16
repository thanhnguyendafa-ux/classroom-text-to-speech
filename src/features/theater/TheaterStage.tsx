import { Image as ImageIcon } from 'lucide-react';
import type { SpeechItem } from '../../types';

interface WaitingState {
  isWaiting: boolean;
  remainingSec: number;
  type: 'repeat' | 'advance' | null;
}

interface TheaterStageProps {
  activeItem: SpeechItem | undefined;
  activeIndex: number;
  speechCount: number;
  playingItemId: string | null;
  currentRepeatIndex: number;
  waitingState: WaitingState;
  isManualPaused: boolean;
  activeImageUrl?: string;
  hideControls: boolean;
  engineMode: 'browser' | 'premium';
}

export function TheaterStage({ activeItem, activeIndex, speechCount, playingItemId, currentRepeatIndex, waitingState, isManualPaused, activeImageUrl, hideControls, engineMode }: TheaterStageProps) {
  return (
    <div className="flex-1 relative flex items-center justify-center p-4 min-h-0 bg-slate-1000 z-10 select-none">
      {activeImageUrl ? <div className="absolute inset-0 overflow-hidden pointer-events-none select-none"><img src={activeImageUrl} alt="blurred bg" className="w-full h-full object-cover blur-2xl opacity-20 scale-110" referrerPolicy="no-referrer" /></div> : null}
      <div className="w-full max-w-4xl aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-900/60 relative flex flex-col items-center justify-center">
        <div className="flex-1 w-full h-full relative flex items-center justify-center">
          {activeImageUrl ? <img src={activeImageUrl} alt={activeItem ? activeItem.text : 'Chủ đề'} className="absolute inset-0 w-full h-full object-cover transition-all duration-300" referrerPolicy="no-referrer" /> : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-900 to-indigo-950 flex flex-col items-center justify-center p-10">
              <div className="w-16 h-16 rounded-full bg-blue-600/35 border border-blue-400/30 flex items-center justify-center text-white/90 animate-pulse mb-4 z-10 shadow-xs"><ImageIcon className="w-8 h-8 opacity-80" /></div>
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
            </div>
          )}
          <div className="absolute bottom-6 inset-x-4 text-center z-10 px-4">
            <div className="inline-block bg-black/60 backdrop-blur-md border border-white/5 py-3 px-6 sm:px-8 rounded-2xl max-w-3xl shadow-xl transition-all">
              <span className="text-xl sm:text-3.5xl font-extrabold text-white text-center tracking-tight leading-normal drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] uppercase-none block">{activeItem ? activeItem.text : 'Chưa tải bài luyện'}</span>
              {playingItemId === activeItem?.id && <div className="flex items-center justify-center space-x-1.5 mt-2 text-xs font-mono">
                {isManualPaused ? <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md animate-pulse uppercase text-[10px]">⏸️ Đang tạm dừng</span> : waitingState.isWaiting ? <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">⏱️ {waitingState.type === 'repeat' ? 'Chờ lặp' : 'Chờ chuyển câu'}: {waitingState.remainingSec}s</span> : <span className="text-indigo-400 font-extrabold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-pulse uppercase text-[10px]">🔊 Đang phát (Lần {currentRepeatIndex}/{activeItem.repeats || 1})</span>}
              </div>}
            </div>
          </div>
        </div>
        {!hideControls && <>
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-black/60 border border-white/10 text-slate-300 px-3 py-1 text-xs font-mono rounded-lg flex items-center gap-1.5 backdrop-blur-xs">{activeIndex !== -1 ? `${activeIndex + 1} / ${speechCount}` : '—'}</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${activeItem?.resolvedLang === 'vi' ? 'bg-rose-600/80 border border-rose-500/50 text-white' : 'bg-indigo-650/80 border border-indigo-500/50 text-white'}`}>{activeItem?.resolvedLang === 'vi' ? '🇻🇳 VI Voice' : '🇺🇸 EN Voice'}</span>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">{engineMode === 'premium' ? <span className="bg-amber-600 border border-amber-500/40 text-white px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg animate-pulse">💎 Active: Premium Voice (Gemini AI)</span> : <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 text-[10px] font-semibold rounded-lg">🌐 Active: Browser Engine</span>}</div>
        </>}
      </div>
    </div>
  );
}
