import React from 'react';
import { Pause, Play, SkipBack, SkipForward, Sliders, Square, Timer, Volume2, VolumeX } from 'lucide-react';

interface TheaterPlaybackControlsProps {
  itemCount: number;
  playingState: 'idle' | 'playing' | 'paused';
  isManualPaused: boolean;
  speed: number;
  volume: number;
  autoAdvance: boolean;
  timeBetweenLines: number;
  playlistLoopMode: 'once' | 'infinite';
  collapsed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onAutoAdvanceChange: (enabled: boolean) => void;
  onTimeBetweenLinesChange: (seconds: number) => void;
  onPlaylistLoopModeChange: (mode: 'once' | 'infinite') => void;
}

export const TheaterPlaybackControls = React.memo(function TheaterPlaybackControls(props: TheaterPlaybackControlsProps) {
  return (
    <div className={`bg-slate-950 border-t border-slate-900 flex flex-col z-20 transition-all duration-300 ${props.collapsed ? 'h-0 py-0 border-t-0 opacity-0 overflow-hidden shrink-0' : 'px-5 py-4 h-auto opacity-100 shrink-0 space-y-4'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5 justify-center sm:justify-start">
          <button type="button" onClick={props.onPrevious} disabled={props.itemCount <= 1} className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 cursor-pointer"><SkipBack className="w-4 h-4 fill-current" /></button>
          <button type="button" onClick={props.onPlay} disabled={props.itemCount === 0} className={`p-3.5 rounded-full flex items-center justify-center cursor-pointer ${props.playingState !== 'idle' && !props.isManualPaused ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-indigo-100'}`}><Play className="w-4 h-4 fill-current ml-0.5" /></button>
          <button type="button" onClick={props.onPause} disabled={props.playingState === 'idle' || props.isManualPaused} className={`p-3 rounded-full flex items-center justify-center cursor-pointer ${props.isManualPaused ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-900 border border-slate-850 text-slate-400 disabled:opacity-30'}`}><Pause className="w-4 h-4 fill-current" /></button>
          <button type="button" onClick={props.onStop} disabled={props.playingState === 'idle' && !props.isManualPaused} className="p-3 bg-rose-600 text-white rounded-full transition disabled:opacity-30 cursor-pointer"><Square className="w-4 h-4 fill-current" /></button>
          <button type="button" onClick={props.onNext} disabled={props.itemCount <= 1} className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 cursor-pointer"><SkipForward className="w-4 h-4 fill-current" /></button>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 flex-1">
          <Toggle label="Tự động chuyển" enabled={props.autoAdvance} onChange={props.onAutoAdvanceChange} />
          {props.autoAdvance ? <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2 text-xs"><Timer className="w-3.5 h-3.5 text-slate-400" /><input type="range" min="1" max="8" step="0.5" className="accent-indigo-500 w-20 h-1 bg-slate-800" value={props.timeBetweenLines} onChange={event => props.onTimeBetweenLinesChange(Number(event.target.value))} /><span className="font-mono font-bold text-indigo-400">{props.timeBetweenLines}s</span></div> : null}
          <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2 text-xs"><Sliders className="w-3.5 h-3.5 text-slate-400" /><div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-850">{[0.5, 1, 1.25, 1.5, 2].map(rate => <button key={rate} type="button" onClick={() => props.onSpeedChange(rate)} className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${Math.abs(props.speed - rate) < 0.05 ? 'bg-indigo-600 text-white' : 'text-slate-450'}`}>{rate === 1 ? '1x' : `${rate}x`}</button>)}</div></div>
          <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2"><button type="button" onClick={() => props.onVolumeChange(props.volume === 0 ? 1 : 0)} className="p-1 text-slate-400 hover:text-white rounded">{props.volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}</button><input type="range" min="0" max="1.5" step="0.1" className="accent-indigo-500 w-16 h-1 bg-slate-800" value={props.volume} onChange={event => props.onVolumeChange(Number(event.target.value))} /><span className="text-[10px] font-mono font-bold text-slate-400 w-8">{Math.round(props.volume * 100)}%</span></div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs"><span className="text-slate-400 font-bold">Vòng lặp:</span><button type="button" onClick={() => props.onPlaylistLoopModeChange('once')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${props.playlistLoopMode === 'once' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>🎯 Phát 1 lần</button><button type="button" onClick={() => props.onPlaylistLoopModeChange('infinite')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${props.playlistLoopMode === 'infinite' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>🔁 Lặp vô hạn</button></div>
    </div>
  );
});
function Toggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!enabled)} className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer ${enabled ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{label}: {enabled ? 'Bật' : 'Tắt'}</button>;
}
