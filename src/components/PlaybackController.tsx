import React from 'react';
import { Upload, Share2, Radio, Download, Play, VolumeX, Trash2 } from 'lucide-react';
import { SpeechItem } from '../types';

interface PlaybackControllerProps {
  speechList: SpeechItem[];
  rowLayoutMode: 'below' | 'side';
  toggleRowLayoutMode: (mode: 'below' | 'side') => void;
  onImportClick: () => void;
  onShareClick: () => void;
  onExportAudioClick: () => void;
  onExportBackupClick: () => void;
  onPlayAll: () => void;
  onStopAll: () => void;
  onClearAll: () => void;
  autoAdvance: boolean;
}

export const PlaybackController: React.FC<PlaybackControllerProps> = ({
  speechList,
  rowLayoutMode,
  toggleRowLayoutMode,
  onImportClick,
  onShareClick,
  onExportAudioClick,
  onExportBackupClick,
  onPlayAll,
  onStopAll,
  onClearAll,
  autoAdvance
}) => {
  return (
    <div id="drill-mode-toolbar" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
      <div className="flex flex-col text-left">
        <h3 className="font-extrabold text-slate-900 text-base">Hàng Đợi Trình Chiếu Âm Thanh</h3>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
          Kéo thả để sắp xếp lại thứ tự đọc, bấm loa từng câu đơn lẻ hoặc kích hoạt chuỗi tự động cuốn
        </p>
        
        {/* Toggle layout mode */}
        <div className="flex bg-slate-100/80 p-0.5.5 rounded-lg border border-slate-200/50 mt-2 self-start shrink-0">
          <button
            type="button"
            onClick={() => toggleRowLayoutMode('below')}
            className={`text-[10px] sm:text-[11.5px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              rowLayoutMode === 'below'
                ? 'bg-white text-indigo-700 shadow-3xs border border-indigo-100/50'
                : 'text-slate-550 hover:text-slate-800'
            }`}
            title="Nút cấu hình xếp dưới, dòng chữ chiếm trọn chiều ngang rất dễ nhìn"
          >
            ⚡ Bố cục rộng (Nút dưới)
          </button>
          <button
            type="button"
            onClick={() => toggleRowLayoutMode('side')}
            className={`text-[10px] sm:text-[11.5px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              rowLayoutMode === 'side'
                ? 'bg-white text-indigo-700 shadow-3xs border border-indigo-100/50'
                : 'text-slate-550 hover:text-slate-800'
            }`}
            title="Nút cấu hình xếp cạnh dòng chữ"
          >
            🎛️ Bố cục gọn (Bên cạnh)
          </button>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
        {/* Import Button (Always available) */}
        <button
          id="import-list-trigger"
          type="button"
          onClick={onImportClick}
          className="text-xs font-bold bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 py-1.5 px-3 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-3xs shrink-0"
          title="Nhập và phục hồi bài luyện tập từ file backup đã lưu (.json)"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-650" />
          <span>Nhập File Backup</span>
        </button>

        {speechList.length > 0 && (
          <>
            {/* Public Sharing Button */}
            <button
              id="share-list-trigger"
              type="button"
              onClick={onShareClick}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-3xs shrink-0"
              title="Tạo liên kết chia sẻ công khai bài học này với đầy đủ cài đặt, tốc độ, hình hình minh họa của bạn"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ liên kết</span>
            </button>

            {/* Export Audio Button */}
            <button
              id="export-audio-trigger"
              type="button"
              onClick={onExportAudioClick}
              className="text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/60 py-1.5 px-3 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-3xs shrink-0"
              title="Xuất bài học thành file âm thanh (MP3, WAV) chất lượng cao"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Xuất File Nghe MP3</span>
            </button>

            {/* Export Button */}
            <button
              id="export-list-trigger"
              type="button"
              onClick={onExportBackupClick}
              className="text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100/60 py-1.5 px-3 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-3xs shrink-0"
              title="Xuất cấu hình bài tập kèm thông số nghỉ dừng, số lần lặp, vận tốc, link hình ảnh đã tối ưu ra máy cá nhân (.json)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File Backup</span>
            </button>

            {/* Play All Drill Mode trigger button */}
            <button
              id="play-all-drill-trigger"
              type="button"
              onClick={onPlayAll}
              className="text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 py-1.5 px-3 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-3xs shrink-0"
              title={autoAdvance ? "Liên tục phát các dòng" : "Phát từ câu đầu tiên"}
            >
              <Play className="w-3.5 h-3.5 fill-indigo-700" />
              Phát chuỗi luyện tập (Play)
            </button>

            <button
              id="stop-global-audio"
              type="button"
              onClick={onStopAll}
              className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-202 py-1.5 px-2.5 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
              title="Ngưng mọi giọng đọc ngay"
            >
              <VolumeX className="w-3.5 h-3.5 text-slate-600" />
              Dừng audio
            </button>

            <button
              id="clear-list-trigger"
              type="button"
              onClick={onClearAll}
              className="text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100/50 py-1.5 px-2.5 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer shadow-3xs shrink-0"
              title="Xoá hết danh sách câu"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Xoá bảng
            </button>
          </>
        )}
      </div>
    </div>
  );
};
