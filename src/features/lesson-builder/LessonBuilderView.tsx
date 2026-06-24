import React from 'react';
import AppWorkspace from '../../components/AppWorkspace';
import { 
  Save, 
  Copy, 
  Download, 
  Share2, 
  Cloud, 
  Edit3,
  Sparkles,
  Info
} from 'lucide-react';

interface LessonBuilderViewProps {
  currentLessonId: string | null;
  currentLessonTitle: string;
  setCurrentLessonTitle: (title: string) => void;
  onSaveLesson: () => void;
  onSaveAsCopy?: () => void;
  isSaving: boolean;
  onOpenExport: () => void;
  onOpenShare: () => void;
  
  // Slotted AppWorkspace columns
  leftColumn: React.ReactNode;
  centerColumn: React.ReactNode;
  rightColumn: React.ReactNode;
  speechCount: number;
}

export const LessonBuilderView: React.FC<LessonBuilderViewProps> = ({
  currentLessonId,
  currentLessonTitle,
  setCurrentLessonTitle,
  onSaveLesson,
  onSaveAsCopy,
  isSaving,
  onOpenExport,
  onOpenShare,
  leftColumn,
  centerColumn,
  rightColumn,
  speechCount
}) => {
  return (
    <div id="lesson-builder-view" className="space-y-6">
      
      {/* Builder Workspace Header & Action toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left">
        
        {/* Title Input & Metadata */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
              Không gian thiết kế bài học
            </span>
            {currentLessonId ? (
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Đang mở từ thư viện
              </span>
            ) : (
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Bài học mới (Chưa lưu)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              id="builder-lesson-title-input"
              value={currentLessonTitle}
              onChange={(e) => setCurrentLessonTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài học (Ví dụ: Từ vựng Giao thông)..."
              className="w-full text-base sm:text-lg font-extrabold text-slate-900 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-hidden py-0.5 transition font-sans"
            />
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          
          {/* Quick save button */}
          <button
            type="button"
            onClick={onSaveLesson}
            disabled={isSaving}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer select-none"
            title={currentLessonId ? "Lưu đè thay đổi lên đám mây" : "Lưu bài học mới lên đám mây"}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{currentLessonId ? 'Lưu thay đổi' : 'Lưu bài học'}</span>
          </button>

          {/* Save as copy (only displayed if lesson already exists) */}
          {currentLessonId && onSaveAsCopy && (
            <button
              type="button"
              onClick={onSaveAsCopy}
              disabled={isSaving}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-98 cursor-pointer select-none"
              title="Lưu thành một bản sao mới"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Lưu bản sao</span>
            </button>
          )}

          {/* Export MP3 */}
          <button
            type="button"
            onClick={onOpenExport}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-98 cursor-pointer select-none"
            title="Xuất các câu thành file âm thanh"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất MP3</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={onOpenShare}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-98 cursor-pointer select-none"
            title="Tạo link chia sẻ playlist"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ</span>
          </button>

        </div>
      </div>

      {/* Embedded 3-Column Slot Component */}
      <AppWorkspace
        speechCount={speechCount}
        leftColumn={leftColumn}
        centerColumn={centerColumn}
        rightColumn={rightColumn}
      />

    </div>
  );
};

export default LessonBuilderView;
