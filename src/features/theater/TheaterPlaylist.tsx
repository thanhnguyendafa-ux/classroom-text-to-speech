import React from 'react';
import type { SpeechItem } from '../../types';

interface TheaterPlaylistProps {
  speechList: SpeechItem[];
  playingItemId: string | null;
  onPlayItem: (item: SpeechItem) => void;
  useUniversalImage: boolean;
  universalImageUrl: string;
}

export const TheaterPlaylist = React.memo(function TheaterPlaylist({ speechList, playingItemId, onPlayItem, useUniversalImage, universalImageUrl }: TheaterPlaylistProps) {
  return (
    <div className="w-full lg:w-80 bg-slate-950 border-l border-slate-900 flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-slate-900 flex items-center justify-between shrink-0">
        <div className="text-left">
          <h3 className="font-extrabold text-sm text-white">Danh Sách Câu Huấn Luyện</h3>
          <p className="text-[10px] text-slate-400 mt-1">Phát lần lượt từ trên xuống dưới</p>
        </div>
        <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded-full uppercase">{speechList.length} Câu</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {speechList.map((item, index) => {
          const isPlaying = playingItemId === item.id;
          const imageUrl = useUniversalImage && universalImageUrl ? universalImageUrl : item.imageUrl;
          return (
            <button key={item.id} onClick={() => onPlayItem(item)} className={`w-full text-left p-2 rounded-xl transition flex items-center gap-3 border ${isPlaying ? 'bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500' : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/50 hover:border-slate-800'} cursor-pointer group`}>
              <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative shadow-3xs">
                {imageUrl ? <img src={imageUrl} alt="cover thumbnail" className="w-full h-full object-cover transition group-hover:scale-105" referrerPolicy="no-referrer" /> : <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-950 flex items-center justify-center"><span className="text-[10px] font-mono font-extrabold text-white/90">{index + 1}</span></div>}
                {isPlaying ? <div className="absolute inset-0 bg-indigo-950/65 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" /></div> : null}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-slate-400">CÂU {index + 1}</span>
                  <span className={`text-[9px] font-extrabold rounded px-1 ${item.resolvedLang === 'vi' ? 'bg-rose-950 border border-rose-900 text-rose-300' : 'bg-indigo-950 border border-indigo-900 text-indigo-300'}`}>{item.resolvedLang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}</span>
                </div>
                <p className={`text-xs mt-1 font-semibold truncate leading-tight ${isPlaying ? 'text-indigo-200' : 'text-slate-300 group-hover:text-white'}`}>{item.text}</p>
              </div>
              {isPlaying ? <div className="flex items-end space-x-0.5 h-3 shrink-0 pr-1 select-none animate-pulse"><span className="w-0.5 h-2.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-100" /><span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-300" /><span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-0" /></div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});
