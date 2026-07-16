import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Film, X } from 'lucide-react';
import { RecordingControls } from './RecordingControls';

type Resolution = '720p' | '1080p';

interface TheaterHeaderProps {
  hidden: boolean;
  isRecording: boolean;
  recordingTime: string;
  resolution: Resolution;
  includeMicrophone: boolean;
  disableEchoCancellation: boolean;
  onlyCurrentTab: boolean;
  showConfig: boolean;
  showHelp: boolean;
  onRestore: () => void;
  onHide: () => void;
  onClose: () => void;
  onStopRecording: () => void;
  onStartRecording: () => void;
  onShowConfigChange: (value: boolean) => void;
  onResolutionChange: (value: Resolution) => void;
  onMicrophoneChange: (value: boolean) => void;
  onEchoCancellationChange: (value: boolean) => void;
  onCurrentTabChange: (value: boolean) => void;
  onShowHelpChange: (value: boolean) => void;
}

export function TheaterHeader(props: TheaterHeaderProps) {
  if (props.hidden) {
    return <div className="absolute top-4 right-4 z-50 flex items-center gap-2 select-none">
      <span className="text-[10px] text-slate-500 font-mono bg-slate-950/80 border border-slate-900/60 px-2 py-1 rounded-lg backdrop-blur-xs">Mẹo: Phím <strong className="text-indigo-300 font-extrabold font-mono">H</strong> để Ẩn / Hiện</span>
      <button onClick={props.onRestore} className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition shadow-xl cursor-pointer backdrop-blur-md opacity-40 hover:opacity-100 duration-200" title="Hiện lại toàn bộ nút và bảng điều khiển (hoặc bấm phím H)"><Eye className="w-4 h-4 text-indigo-400" /><span>Hiện Giao Diện</span></button>
    </div>;
  }

  return <div className="h-14 sm:h-16 px-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/90 z-20 gap-4">
    <div className="flex items-center space-x-2 shrink-0"><div className="p-1.5 bg-indigo-600 rounded-lg text-white hidden sm:block"><Film className="w-5 h-5" /></div><div className="text-left"><h1 className="font-extrabold text-xs sm:text-base tracking-tight text-white flex items-center gap-1.5">Rạp Chiếu Luyện Tập <span className="text-[9px] sm:text-[10px] bg-indigo-500/35 border border-indigo-500/50 text-indigo-200 font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase">Cinema Mode</span></h1><p className="text-[10px] text-slate-400 hidden md:block">Chế độ chiếu ảnh kèm phụ đề hỗ trợ nghe chép chính tả lớp học</p></div></div>
    <RecordingControls isRecording={props.isRecording} recordingTime={props.recordingTime} resolution={props.resolution} includeMicrophone={props.includeMicrophone} disableEchoCancellation={props.disableEchoCancellation} onlyCurrentTab={props.onlyCurrentTab} showConfig={props.showConfig} showHelp={props.showHelp} onStop={props.onStopRecording} onStart={props.onStartRecording} onShowConfigChange={props.onShowConfigChange} onResolutionChange={props.onResolutionChange} onMicrophoneChange={props.onMicrophoneChange} onEchoCancellationChange={props.onEchoCancellationChange} onCurrentTabChange={props.onCurrentTabChange} onShowHelpChange={props.onShowHelpChange} />
    <button onClick={props.onHide} className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-indigo-950 hover:border-indigo-900 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer shrink-0" title="Ẩn giao diện điều khiển để tập trung quay video"><EyeOff className="w-4 h-4 text-indigo-400" /><span className="hidden sm:inline">Ẩn Giao Diện</span></button>
    <button onClick={props.onClose} className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-950 hover:border-rose-900 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer shrink-0" title="Thoát chế độ rạp chiếu phim"><X className="w-4 h-4 text-rose-500" /><span className="hidden sm:inline">Thoát Rạp Chiếu</span></button>
  </div>;
}

export function TheaterErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return <div className="mx-4 mt-3 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-2xl text-xs space-y-1 relative select-text z-40 shadow-lg"><div className="font-extrabold flex items-center gap-1.5 text-red-300"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /><span>Gợi ý xử lý ghi hình màn hình</span><button onClick={onDismiss} className="absolute top-2.5 right-3 text-red-400 hover:text-white p-1 hover:bg-red-900/30 rounded cursor-pointer"><X className="w-3.5 h-3.5" /></button></div><p className="leading-relaxed font-semibold">{message}</p></div>;
}

export function TheaterBottomBarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return <div className={`relative w-full z-30 flex justify-center ${collapsed ? 'absolute bottom-4 left-0 right-0' : 'h-0 -mt-3.5'}`}><button type="button" id="toggle-bottom-bar-trigger" onClick={onToggle} className="px-4 py-1.5 bg-slate-900/95 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 text-slate-300 rounded-full flex items-center space-x-1.5 text-[11px] font-bold shadow-lg shadow-black/90 transition-all duration-200 cursor-pointer backdrop-blur-md">{collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}<span>{collapsed ? 'Hiện thanh điều khiển' : 'Thu gọn thanh điều khiển'}</span></button></div>;
}
