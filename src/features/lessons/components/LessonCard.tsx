import React from 'react';
import { FileText, Edit2, Trash2, Check, X, Play, Image, Cpu } from 'lucide-react';
import { SpeechItem } from '../../../types';

interface LessonCardProps {
  id: string;
  title: string;
  rawText: string;
  createdAt: number;
  speechList?: SpeechItem[];
  settings?: any;
  folderId?: string | null;
  isEditing: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (val: string) => void;
  onLoad: () => void;
  onStartRename: (id: string, currentTitle: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteRequest: (id: string, title: string) => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  id,
  title,
  rawText,
  createdAt,
  speechList = [],
  settings = {} as any,
  folderId,
  isEditing,
  editingTitleValue,
  setEditingTitleValue,
  onLoad,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteRequest,
}) => {
  const lineCount = rawText.split('\n').filter(l => l.trim().length > 0).length;
  const imageCount = speechList.filter(item => item.imageUrl).length;
  
  // Parse setting details
  const engineMode = settings.engineMode === 'premium' ? 'Premium' : 'Trình duyệt';
  const speed = settings.speed ? `${settings.speed}x` : '1.0x';

  return (
    <div
      id={`lesson-card-${id}`}
      className="group bg-white hover:border-slate-300 border border-slate-200/80 rounded-xl p-3.5 shadow-xs hover:shadow-xs transition duration-200 flex flex-col justify-between h-[150px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div 
          onClick={() => { if (!isEditing) onLoad(); }}
          className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer"
        >
          <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg shrink-0 mt-0.5 group-hover:bg-indigo-100 transition duration-200">
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                id={`rename-lesson-input-${id}`}
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-white border border-indigo-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 font-bold text-slate-800 w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') onCancelRename();
                }}
                autoFocus
              />
            ) : (
              <h4 className="text-xs font-bold text-slate-800 hover:text-indigo-650 transition leading-snug line-clamp-2" title={title}>
                {title}
              </h4>
            )}
            
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium flex items-center gap-2 flex-wrap">
              <span>{lineCount} dòng</span>
              {imageCount > 0 && (
                <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                  <Image className="w-3 h-3" />
                  {imageCount} ảnh
                </span>
              )}
              <span>•</span>
              <span>{new Date(createdAt).toLocaleDateString('vi-VN')}</span>
            </p>
          </div>
        </div>

        {/* Action Menu (Rename, Delete) */}
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                id={`save-rename-lesson-btn-${id}`}
                onClick={onSaveRename}
                className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                title="Lưu"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id={`cancel-rename-lesson-btn-${id}`}
                onClick={onCancelRename}
                className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                title="Hủy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition duration-150 flex items-center gap-0.5">
              <button
                type="button"
                id={`start-rename-lesson-btn-${id}`}
                onClick={() => onStartRename(id, title)}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                title="Đổi tên"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id={`delete-lesson-btn-${id}`}
                onClick={() => onDeleteRequest(id, title)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                title="Xóa bài học"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer info: Settings badges and a big Nạp Button */}
      <div className="flex items-center justify-between border-t border-slate-100/60 pt-2 mt-2 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-50 text-[9px] font-bold text-slate-500 rounded border border-slate-200/50">
            <Cpu className="w-2.5 h-2.5 text-slate-400" />
            {engineMode}
          </span>
          <span className="inline-flex px-1.5 py-0.5 bg-indigo-50/50 text-[9px] font-extrabold text-indigo-650 rounded border border-indigo-100/30">
            {speed}
          </span>
        </div>

        {!isEditing && (
          <button
            type="button"
            id={`load-lesson-card-btn-${id}`}
            onClick={onLoad}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition duration-150 cursor-pointer shadow-3xs"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Nạp</span>
          </button>
        )}
      </div>
    </div>
  );
};
