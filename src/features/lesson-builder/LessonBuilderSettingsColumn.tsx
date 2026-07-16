import type { ComponentProps } from 'react';
import { Image as ImageIcon, Search, Sparkles, X } from 'lucide-react';
import { SpeechSettingsPanel } from '../../components/SpeechSettingsPanel';

interface Props {
  speechSettings: ComponentProps<typeof SpeechSettingsPanel>;
  useUniversalImage: boolean;
  universalImageUrl: string;
  showChromeTip: boolean;
  onUniversalImageChange: (value: boolean) => void;
  onSearchUniversalImage: () => void;
  onClearUniversalImage: () => void;
  onToggleChromeTip: () => void;
}
export function LessonBuilderSettingsColumn(props: Props) {
  return <>
    <SpeechSettingsPanel {...props.speechSettings} />
    <div id="universal-theme-box" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3"><h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-600" />Ảnh nền đồng nhất chuỗi học</h3><span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Tùy chọn</span></div>
      <div className="space-y-3"><div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3"><div className="flex flex-col pr-2 text-xs"><span className="font-bold text-slate-700">Đồng nhất ảnh minh họa</span><span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Áp dụng một ảnh nền duy nhất cho tất cả các câu</span></div><label className="relative inline-flex items-center cursor-pointer select-none shrink-0"><input type="checkbox" checked={props.useUniversalImage} onChange={event => props.onUniversalImageChange(event.target.checked)} className="sr-only peer" /><div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" /></label></div>
        {props.useUniversalImage && <div className="space-y-2"><button type="button" onClick={props.onSearchUniversalImage} className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-[11px] font-bold transition cursor-pointer"><Search className="w-3.5 h-3.5" />Tìm ảnh</button>{props.universalImageUrl && <div className="relative mt-2 rounded-xl overflow-hidden aspect-[16/6] border border-slate-200 group/uimg"><img src={props.universalImageUrl} alt="Universal Theme Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" /><button type="button" onClick={props.onClearUniversalImage} className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-90 transition shadow-xs cursor-pointer"><X className="w-3 h-3" /></button></div>}</div>}
      </div>
    </div>
    <div id="chrome-voice-info-card" className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-4 text-xs text-emerald-800 text-left"><button type="button" onClick={props.onToggleChromeTip} className="w-full flex items-center justify-between text-emerald-900 font-bold select-none cursor-pointer"><div className="flex items-center space-x-2"><Sparkles className="w-4 h-4 text-emerald-600 shrink-0" /><span>Mẹo dùng giọng Chrome hay nhất</span></div><span className="text-[10px] text-emerald-650 underline font-extrabold shrink-0 ml-2">{props.showChromeTip ? 'Ẩn trợ giúp' : 'Bấm Trợ giúp'}</span></button>{props.showChromeTip && <p className="leading-relaxed mt-2.5 pt-2.5 border-t border-emerald-100/60 text-slate-700 text-[11px] animate-fade-in">Chrome có sẵn giọng Google tiếng Việt và Google US English. Chọn giọng có chữ Google hoặc chuyển sang Premium AI.</p>}</div>
  </>;
}
