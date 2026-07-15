import React from 'react';
import { Folder, FileText, ArrowLeft, ChevronRight, FolderOpen, Edit2, Trash2, Check, X, Play } from 'lucide-react';
import type { LibraryDeleteTarget, LibraryDisplayFolder, LibraryDisplayLesson } from '../libraryDisplayModel';

interface LibraryListProps {
  folders: LibraryDisplayFolder[];
  uncategorizedLessons: LibraryDisplayLesson[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  activeTab: 'local' | 'cloud';

  // Editing and deletion states
  editingFolderId: string | null;
  editingFolderName: string;
  setEditingFolderName: (val: string) => void;
  handleStartRenameFolder: (id: string, name: string) => void;
  handleSaveRenameFolder: () => void;
  handleSaveRenameCloudFolder: () => void;
  setEditingFolderId: (id: string | null) => void;

  editingLessonId: string | null;
  editingLessonTitle: string;
  setEditingLessonTitle: (val: string) => void;
  handleStartRenameLesson: (id: string, title: string) => void;
  handleSaveRenameLesson: (folderId?: string) => void;
  handleSaveRenameCloudLesson: () => void;
  setEditingLessonId: (id: string | null) => void;

  setDeleteConfirmTarget: (target: LibraryDeleteTarget) => void;
  onLoadLesson: (lesson: LibraryDisplayLesson) => void;
}

export const LibraryList: React.FC<LibraryListProps> = ({
  folders,
  uncategorizedLessons,
  selectedFolderId,
  setSelectedFolderId,
  activeTab,
  editingFolderId,
  editingFolderName,
  setEditingFolderName,
  handleStartRenameFolder,
  handleSaveRenameFolder,
  handleSaveRenameCloudFolder,
  setEditingFolderId,
  editingLessonId,
  editingLessonTitle,
  setEditingLessonTitle,
  handleStartRenameLesson,
  handleSaveRenameLesson,
  handleSaveRenameCloudLesson,
  setEditingLessonId,
  setDeleteConfirmTarget,
  onLoadLesson,
}) => {
  const isCloud = activeTab === 'cloud';

  // Render drilldown view inside list mode
  if (selectedFolderId) {
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    if (!currentFolder) {
      setSelectedFolderId(null);
      return null;
    }

    return (
      <div id="list-drilldown-view" className="space-y-3 animate-fadeIn">
        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
          <button
            type="button"
            id="list-back-btn"
            onClick={() => setSelectedFolderId(null)}
            className="flex items-center gap-1 hover:text-indigo-650 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-400 hover:text-slate-600 transition cursor-pointer" onClick={() => setSelectedFolderId(null)}>
            Thư mục
          </span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-indigo-650 flex items-center gap-1 truncate">
            <FolderOpen className="w-3.5 h-3.5 fill-current opacity-80" />
            {currentFolder.name}
          </span>
        </div>

        {/* List Table of lessons in folder */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3">Tên bài học</th>
                <th className="p-3 hidden sm:table-cell">Loại</th>
                <th className="p-3">Số dòng</th>
                <th className="p-3 hidden md:table-cell">Cập nhật</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentFolder.lessons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                    Thư mục này chưa có bài học nào.
                  </td>
                </tr>
              ) : (
                currentFolder.lessons.map((lesson) => {
                  const isLessonEditing = editingLessonId === lesson.id;
                  const lineCount = lesson.rawText.split('\n').filter((l: string) => l.trim().length > 0).length;

                  return (
                    <tr key={lesson.id} className="hover:bg-slate-50/50 group transition duration-150">
                      <td className="p-3 font-semibold text-slate-750">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          {isLessonEditing ? (
                            <input
                              type="text"
                              id={`list-rename-lesson-input-${lesson.id}`}
                              value={editingLessonTitle}
                              onChange={(e) => setEditingLessonTitle(e.target.value)}
                              className="text-xs bg-white border border-indigo-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 font-bold text-slate-800 w-full max-w-md"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') isCloud ? handleSaveRenameCloudLesson() : handleSaveRenameLesson(currentFolder.id);
                                if (e.key === 'Escape') setEditingLessonId(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="truncate hover:text-indigo-650 cursor-pointer"
                              onClick={() => onLoadLesson(lesson)}
                              title="Click để nạp bài học"
                            >
                              {lesson.title}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500 hidden sm:table-cell">Bài học</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{lineCount} dòng</td>
                      <td className="p-3 text-slate-400 hidden md:table-cell">{new Date(lesson.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLessonEditing ? (
                            <>
                              <button
                                type="button"
                                id={`list-save-rename-lesson-btn-${lesson.id}`}
                                onClick={() => isCloud ? handleSaveRenameCloudLesson() : handleSaveRenameLesson(currentFolder.id)}
                                className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                id={`list-cancel-rename-lesson-btn-${lesson.id}`}
                                onClick={() => setEditingLessonId(null)}
                                className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                id={`list-load-lesson-btn-${lesson.id}`}
                                onClick={() => onLoadLesson(lesson)}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded text-[10px] font-bold transition duration-150 cursor-pointer"
                              >
                                Nạp
                              </button>
                              <button
                                type="button"
                                id={`list-start-rename-lesson-btn-${lesson.id}`}
                                onClick={() => handleStartRenameLesson(lesson.id, lesson.title)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded md:opacity-0 group-hover:opacity-100 transition"
                                title="Đổi tên"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                id={`list-delete-lesson-btn-${lesson.id}`}
                                onClick={() => {
                                  setDeleteConfirmTarget({
                                    type: 'lesson',
                                    id: lesson.id,
                                    title: lesson.title,
                                    folderId: currentFolder.id
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded md:opacity-0 group-hover:opacity-100 transition"
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Root view in list mode: folder rows, followed by uncategorized lesson rows
  const hasFolders = folders.length > 0;
  const hasLessons = uncategorizedLessons.length > 0;

  if (!hasFolders && !hasLessons) {
    return (
      <div className="text-center py-10 text-slate-400 text-xs">
        {activeTab === 'cloud'
          ? 'Thư viện đám mây trống.'
          : 'Thư viện máy trống.'}
      </div>
    );
  }

  return (
    <div id="list-root-view" className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs animate-fadeIn">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <th className="p-3">Tên</th>
            <th className="p-3 hidden sm:table-cell">Loại</th>
            <th className="p-3">Chi tiết</th>
            <th className="p-3 hidden md:table-cell">Cập nhật</th>
            <th className="p-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {/* A. Folders */}
          {folders.map(folder => {
            const isFolderEditing = editingFolderId === folder.id;

            return (
              <tr key={folder.id} className="hover:bg-slate-50/50 group transition duration-150">
                <td className="p-3 font-bold text-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                    {isFolderEditing ? (
                      <input
                        type="text"
                        id={`list-rename-folder-input-${folder.id}`}
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        className="text-xs bg-white border border-indigo-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 font-bold text-slate-800 w-full max-w-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') isCloud ? handleSaveRenameCloudFolder() : handleSaveRenameFolder();
                          if (e.key === 'Escape') setEditingFolderId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="truncate hover:text-indigo-650 cursor-pointer"
                        onClick={() => setSelectedFolderId(folder.id)}
                        title="Click để mở thư mục"
                      >
                        {folder.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-slate-500 hidden sm:table-cell">Thư mục</td>
                <td className="p-3 text-slate-500 font-medium">{folder.lessons.length} bài học</td>
                <td className="p-3 text-slate-400 hidden md:table-cell">-</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {isFolderEditing ? (
                      <>
                        <button
                          type="button"
                          id={`list-save-rename-folder-btn-${folder.id}`}
                          onClick={isCloud ? handleSaveRenameCloudFolder : handleSaveRenameFolder}
                          className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`list-cancel-rename-folder-btn-${folder.id}`}
                          onClick={() => setEditingFolderId(null)}
                          className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          id={`list-open-folder-btn-${folder.id}`}
                          onClick={() => setSelectedFolderId(folder.id)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 text-slate-700 rounded text-[10px] font-bold transition duration-150 cursor-pointer"
                        >
                          Mở
                        </button>
                        <button
                          type="button"
                          id={`list-start-rename-folder-btn-${folder.id}`}
                          onClick={() => handleStartRenameFolder(folder.id, folder.name)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded md:opacity-0 group-hover:opacity-100 transition"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          id={`list-delete-folder-btn-${folder.id}`}
                          onClick={() => {
                            setDeleteConfirmTarget({
                              type: 'folder',
                              id: folder.id,
                              title: folder.name
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded md:opacity-0 group-hover:opacity-100 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* B. Uncategorized Lessons */}
          {uncategorizedLessons.map(lesson => {
            const isLessonEditing = editingLessonId === lesson.id;
            const lineCount = lesson.rawText.split('\n').filter((l: string) => l.trim().length > 0).length;

            return (
              <tr key={lesson.id} className="hover:bg-slate-50/50 group transition duration-150">
                <td className="p-3 font-semibold text-slate-750">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    {isLessonEditing ? (
                      <input
                        type="text"
                        id={`list-rename-lesson-input-${lesson.id}`}
                        value={editingLessonTitle}
                        onChange={(e) => setEditingLessonTitle(e.target.value)}
                        className="text-xs bg-white border border-indigo-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 font-bold text-slate-800 w-full max-w-md"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') isCloud ? handleSaveRenameCloudLesson() : handleSaveRenameLesson();
                          if (e.key === 'Escape') setEditingLessonId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="truncate hover:text-indigo-650 cursor-pointer"
                        onClick={() => onLoadLesson(lesson)}
                        title="Click để nạp bài học"
                      >
                        {lesson.title}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-slate-500 hidden sm:table-cell">Bài học lẻ</td>
                <td className="p-3 text-slate-500 font-mono text-[11px]">{lineCount} dòng</td>
                <td className="p-3 text-slate-400 hidden md:table-cell">{new Date(lesson.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {isLessonEditing ? (
                      <>
                        <button
                          type="button"
                          id={`list-save-rename-lesson-btn-${lesson.id}`}
                          onClick={() => isCloud ? handleSaveRenameCloudLesson() : handleSaveRenameLesson()}
                          className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`list-cancel-rename-lesson-btn-${lesson.id}`}
                          onClick={() => setEditingLessonId(null)}
                          className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          id={`list-load-lesson-btn-${lesson.id}`}
                          onClick={() => onLoadLesson(lesson)}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded text-[10px] font-bold transition duration-150 cursor-pointer"
                        >
                          Nạp
                        </button>
                        <button
                          type="button"
                          id={`list-start-rename-lesson-btn-${lesson.id}`}
                          onClick={() => handleStartRenameLesson(lesson.id, lesson.title)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded md:opacity-0 group-hover:opacity-100 transition"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          id={`list-delete-lesson-btn-${lesson.id}`}
                          onClick={() => {
                            setDeleteConfirmTarget({
                              type: 'lesson',
                              id: lesson.id,
                              title: lesson.title
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded md:opacity-0 group-hover:opacity-100 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
