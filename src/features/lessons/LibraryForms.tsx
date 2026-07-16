import { Sparkles } from 'lucide-react';
import type { SavedFolder } from './localLibraryRepository';

interface SaveLessonFormProps {
  visible: boolean;
  title: string;
  folderId: string;
  folders: SavedFolder[];
  onTitleChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function SaveLessonForm({ visible, title, folderId, folders, onTitleChange, onFolderChange, onCancel, onSave }: SaveLessonFormProps) {
  if (!visible) return null;
  return <div id="save-lesson-form" className="p-4 bg-indigo-50/40 border border-indigo-100/60 rounded-xl mb-4 space-y-3 animate-fadeIn">
    <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-600" /><span>Lưu văn bản đang soạn thành bài giảng mới:</span></h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div><label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-1">Tên bài học</label><input type="text" id="save-lesson-title-input" placeholder="Ví dụ: Bài đọc quả táo, Tiếng Anh du lịch..." value={title} onChange={event => onTitleChange(event.target.value)} className="w-full text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" /></div>
      <div><label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-1">Thư mục chứa</label><select id="save-lesson-folder-select" value={folderId} onChange={event => onFolderChange(event.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"><option value="unassigned">-- Chưa phân loại --</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></div>
    </div>
    <div className="text-[10px] text-indigo-700/80 leading-relaxed font-medium bg-white/50 border border-indigo-100/40 p-2.5 rounded-lg">💡 Tự động đồng bộ tốc độ đọc, thời gian nghỉ, giọng đọc và hình minh họa.</div>
    <div className="flex gap-2 justify-end pt-1"><button type="button" id="cancel-save-lesson-btn" onClick={onCancel} className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-200/50 rounded-lg transition cursor-pointer">Hủy</button><button type="button" id="submit-save-lesson-btn" onClick={onSave} className="px-3.5 py-1.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition cursor-pointer">Lưu bài giảng</button></div>
  </div>;
}

interface CreateFolderFormProps { visible: boolean; name: string; onNameChange: (value: string) => void; onCreate: () => void; }
export function CreateFolderForm({ visible, name, onNameChange, onCreate }: CreateFolderFormProps) {
  if (!visible) return null;
  return <div id="create-folder-form" className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl mb-4 space-y-2.5 animate-fadeIn"><h4 className="text-xs font-bold text-slate-700">Tạo thư mục mới trong thư viện:</h4><div className="flex gap-2"><input type="text" id="new-folder-name-input" placeholder="Ví dụ: Du lịch, Giao tiếp song ngữ..." value={name} onChange={event => onNameChange(event.target.value)} className="flex-1 text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" onKeyDown={event => { if (event.key === 'Enter') onCreate(); }} /><button type="button" id="submit-create-folder-btn" onClick={onCreate} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer">Tạo mới</button></div></div>;
}
