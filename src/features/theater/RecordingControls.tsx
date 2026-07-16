import React from 'react';
import { Circle, HelpCircle, Mic, Sliders, Video, X } from 'lucide-react';
import type { RecordingResolution } from '../../application/theater/recordingReducer';

interface RecordingControlsProps {
  isRecording: boolean;
  recordingTime: string;
  resolution: RecordingResolution;
  includeMicrophone: boolean;
  disableEchoCancellation: boolean;
  onlyCurrentTab: boolean;
  showConfig: boolean;
  showHelp: boolean;
  onStop: () => void;
  onStart: () => void;
  onShowConfigChange: (visible: boolean) => void;
  onResolutionChange: (resolution: RecordingResolution) => void;
  onMicrophoneChange: (enabled: boolean) => void;
  onEchoCancellationChange: (disabled: boolean) => void;
  onCurrentTabChange: (enabled: boolean) => void;
  onShowHelpChange: (visible: boolean) => void;
}

export const RecordingControls = React.memo(function RecordingControls(props: RecordingControlsProps) {
  if (props.isRecording) {
    return (
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 bg-rose-950/85 border border-rose-800 text-rose-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg text-xs font-semibold select-none">
        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" /></span>
        <span className="font-mono font-bold tracking-wider text-[11px] sm:text-xs">REC {props.recordingTime}</span>
        <span className="hidden sm:inline-block text-[10px] text-rose-300 border-l border-rose-800/60 pl-2">Màn ({props.resolution}){props.includeMicrophone ? ' + Mic' : ''}</span>
        <button onClick={props.onStop} className="ml-1 sm:ml-2 px-2 py-0.5 sm:py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">Dừng & Lưu</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <button onClick={() => props.onShowConfigChange(!props.showConfig)} className={`flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-slate-200 hover:text-white ${props.showConfig ? 'bg-indigo-650 border border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border border-slate-800 hover:bg-slate-850'}`}>
        <Video className="w-3.5 h-3.5 text-indigo-400" /><span className="text-[11px] sm:text-xs">Ghi Màn Hình</span><Sliders className="w-3 h-3 opacity-60 ml-px" />
      </button>
      {props.showConfig ? (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 max-h-[calc(100vh-80px)] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 text-left text-slate-200 text-xs space-y-3.5 pb-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2"><span className="font-extrabold text-white text-sm flex items-center gap-1.5"><Video className="w-4 h-4 text-indigo-400" />Ghi Hình Chuỗi Học</span><button onClick={() => props.onShowConfigChange(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button></div>
          <div className="space-y-1.5"><label className="font-bold text-slate-300 block">Độ phân giải video:</label><div className="grid grid-cols-3 gap-1.5">{(['480p', '720p', '1080p'] as const).map(resolution => <button key={resolution} onClick={() => props.onResolutionChange(resolution)} className={`py-1 rounded-lg text-center font-mono font-bold border text-[11px] cursor-pointer ${props.resolution === resolution ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-850 text-slate-400'}`}>{resolution}</button>)}</div></div>
          <Toggle label="Ghi Microphone" description="Ghi cả giọng đọc ngoài để đối chiếu." enabled={props.includeMicrophone} onChange={props.onMicrophoneChange} icon={<Mic className="w-3.5 h-3.5 text-emerald-400" />} />
          {props.includeMicrophone ? <Toggle label="Tối ưu thu âm loa ngoài" description="Tắt khử vọng khi cần thu âm thanh từ loa." enabled={props.disableEchoCancellation} onChange={props.onEchoCancellationChange} /> : null}
          <Toggle label="Ưu tiên quay thẻ này" description="Giảm nguy cơ danh sách chia sẻ màn hình trống." enabled={props.onlyCurrentTab} onChange={props.onCurrentTabChange} />
          <div className="rounded-xl border border-slate-800 overflow-hidden"><button onClick={() => props.onShowHelpChange(!props.showHelp)} className="w-full flex items-center justify-between p-2.5 font-bold text-indigo-400 text-[11px] hover:bg-slate-950/80 cursor-pointer"><span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" />Mẹo âm thanh & cách sửa lỗi</span><span>{props.showHelp ? 'ẨN ▲' : 'XEM ▼'}</span></button>{props.showHelp ? <ul className="list-disc pl-5 pr-3 pb-3 space-y-1.5 text-slate-400 text-[10px] border-t border-slate-850/50 pt-2"><li>Chọn chia sẻ âm thanh của thẻ hoặc hệ thống.</li><li>Browser TTS có thể cần bật microphone để thu âm thanh loa ngoài.</li><li>Premium AI có thể thu trực tiếp từ âm thanh hệ thống.</li></ul> : null}</div>
          <button onClick={props.onStart} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"><Circle className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse" />Bắt đầu Ghi hình</button>
        </div>
      ) : null}
    </div>
  );
});

function Toggle({ label, description, enabled, onChange, icon }: { label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void; icon?: React.ReactNode }) {
  return <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850"><div className="space-y-0.5 pr-2"><span className="font-bold text-slate-200 flex items-center gap-1">{icon}{label}</span><span className="text-[10px] text-slate-400 leading-tight block">{description}</span></div><button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent ${enabled ? 'bg-emerald-500' : 'bg-slate-800'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? 'translate-x-4' : 'translate-x-0'}`} /></button></div>;
}
