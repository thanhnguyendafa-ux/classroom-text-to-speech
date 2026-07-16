import React from 'react';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';

interface AudioExportResultProps {
  status: 'success' | 'error';
  audioBlobUrl: string | null;
  logs: string[];
  onReset: () => void;
  onDownload: () => void;
}

export function AudioExportResult({ status, audioBlobUrl, logs, onReset, onDownload }: AudioExportResultProps) {
  if (status === 'error') return (
    <div className="space-y-4 py-4 text-center">
      <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100"><AlertCircle className="w-8 h-8" /></div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h4 className="font-extrabold text-rose-800 text-sm">Chuyển đổi thất bại</h4>
        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 text-left font-mono text-[10px] text-rose-800 max-h-32 overflow-y-auto">{logs.slice().reverse().map((log, index) => <div key={`${index}-${log}`}>{log}</div>)}</div>
      </div>
      <button type="button" onClick={onReset} className="mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer">Trở lại cài đặt</button>
    </div>
  );
  return (
    <div className="space-y-4 text-center py-6">
      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm"><CheckCircle2 className="w-9 h-9" /></div>
      <div className="space-y-1.5"><h4 className="font-extrabold text-slate-800 text-base">Hoàn tất chuyển đổi!</h4><p className="text-xs text-slate-500 font-medium">File âm thanh của bạn đã sẵn sàng lưu trữ ngoại tuyến.</p></div>
      {audioBlobUrl && <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50 max-w-sm mx-auto"><p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-2">Nghe thử bản ghi</p><audio src={audioBlobUrl} controls className="w-full h-8 outline-hidden rounded-lg" /></div>}
      <div className="flex gap-3 max-w-sm mx-auto pt-2 shrink-0">
        <button type="button" onClick={onReset} className="flex-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs transition active:scale-98 cursor-pointer">Xuất thêm set khác</button>
        <button type="button" onClick={onDownload} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"><Download className="w-4 h-4" /><span>Tải về máy</span></button>
      </div>
    </div>
  );
}
