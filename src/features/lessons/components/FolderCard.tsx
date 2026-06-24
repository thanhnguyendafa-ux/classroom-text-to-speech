import React from 'react';
import { Folder, Edit2, Trash2, Check, X, FolderOpen } from 'lucide-react';

interface FolderCardProps {
  id: string;
  name: string;
  lessonCount: number;
  isEditing: boolean;
  editingNameValue: string;
  setEditingNameValue: (val: string) => void;
  onOpen: (id: string) => void;
  onStartRename: (id: string, currentName: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteRequest: (id: string, name: string) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  id,
  name,
  lessonCount,
  isEditing,
  editingNameValue,
  setEditingNameValue,
  onOpen,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteRequest,
}) => {
  return (
    <div
      id={`folder-card-${id}`}
      onClick={() => {
        if (!isEditing) onOpen(id);
      }}
      className="group relative bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 shadow-xs hover:shadow-xs transition duration-250 cursor-pointer flex flex-col justify-between h-[105px]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2 bg-amber-50 text-amber-500 rounded-lg shrink-0 group-hover:bg-amber-100 transition duration-200">
            <Folder className="w-5 h-5 fill-amber-100" />
          </div>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                id={`rename-folder-input-${id}`}
                value={editingNameValue}
                onChange={(e) => setEditingNameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-white border border-indigo-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 font-bold text-slate-800 w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') onCancelRename();
                }}
                autoFocus
              />
            ) : (
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate" title={name}>
                {name}
              </h4>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{lessonCount} bài học</p>
          </div>
        </div>

        {/* Action Menu Buttons */}
        <div 
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <>
              <button
                type="button"
                id={`save-rename-folder-btn-${id}`}
                onClick={onSaveRename}
                className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                title="Lưu"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id={`cancel-rename-folder-btn-${id}`}
                onClick={onCancelRename}
                className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                title="Hủy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                id={`start-rename-folder-btn-${id}`}
                onClick={() => onStartRename(id, name)}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                title="Đổi tên"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                id={`delete-folder-btn-${id}`}
                onClick={() => onDeleteRequest(id, name)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                title="Xóa thư mục"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer link to enter/drilldown */}
      {!isEditing && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60 text-[9px] font-bold text-slate-400 group-hover:text-indigo-500 transition duration-200">
          <span className="uppercase tracking-wider">Mở thư mục</span>
          <FolderOpen className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
        </div>
      )}
    </div>
  );
};
