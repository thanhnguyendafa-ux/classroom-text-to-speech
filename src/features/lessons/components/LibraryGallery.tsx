import React from 'react';
import { ArrowLeft, ChevronRight, FolderOpen, FileDown } from 'lucide-react';
import { FolderCard } from './FolderCard';
import { LessonCard } from './LessonCard';

interface LibraryGalleryProps {
  folders: any[];
  uncategorizedLessons: any[];
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

  setDeleteConfirmTarget: (target: any) => void;
  onLoadLesson: (lesson: any) => void;
}

export const LibraryGallery: React.FC<LibraryGalleryProps> = ({
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
  // If drilled down into a folder
  if (selectedFolderId) {
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    
    if (!currentFolder) {
      // Safety reset if folder is missing
      setSelectedFolderId(null);
      return null;
    }

    return (
      <div id="gallery-drilldown-view" className="space-y-4 animate-fadeIn">
        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
          <button
            type="button"
            id="back-to-root-btn"
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

        {/* Lessons grid in current folder */}
        <div>
          {currentFolder.lessons.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              Thư mục này rỗng. Nhấp "Lưu bản nháp" hoặc "Lưu lên đám mây" và chọn chứa trong thư mục này để lưu bài học mới!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentFolder.lessons.map((lesson: any) => (
                <LessonCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  rawText={lesson.rawText}
                  createdAt={lesson.createdAt}
                  speechList={lesson.speechList}
                  settings={lesson.settings}
                  folderId={currentFolder.id}
                  isEditing={editingLessonId === lesson.id}
                  editingTitleValue={editingLessonTitle}
                  setEditingTitleValue={setEditingLessonTitle}
                  onLoad={() => onLoadLesson(lesson)}
                  onStartRename={handleStartRenameLesson}
                  onSaveRename={() => {
                    if (activeTab === 'cloud') {
                      handleSaveRenameCloudLesson();
                    } else {
                      handleSaveRenameLesson(currentFolder.id);
                    }
                  }}
                  onCancelRename={() => setEditingLessonId(null)}
                  onDeleteRequest={(id, title) => {
                    setDeleteConfirmTarget({
                      type: 'lesson',
                      id,
                      title,
                      folderId: currentFolder.id
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Root view: folders at the top, files (uncategorized) at the bottom
  const hasFolders = folders.length > 0;
  const hasLessons = uncategorizedLessons.length > 0;

  if (!hasFolders && !hasLessons) {
    return (
      <div className="text-center py-10 text-slate-400 text-xs">
        {activeTab === 'cloud'
          ? 'Thư viện đám mây trống. Hãy bấm "Lưu lên đám mây" để lưu bài học đầu tiên!'
          : 'Thư viện máy trống. Hãy lưu bài học nháp đầu tiên của bạn!'}
      </div>
    );
  }

  return (
    <div id="gallery-root-view" className="space-y-6">
      {/* 1. Folders Section */}
      {hasFolders && (
        <div className="space-y-2.5">
          <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5 pl-1">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Thư mục ({folders.length})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {folders.map(folder => (
              <FolderCard
                key={folder.id}
                id={folder.id}
                name={folder.name}
                lessonCount={folder.lessons.length}
                isEditing={editingFolderId === folder.id}
                editingNameValue={editingFolderName}
                setEditingNameValue={setEditingFolderName}
                onOpen={setSelectedFolderId}
                onStartRename={handleStartRenameFolder}
                onSaveRename={activeTab === 'cloud' ? handleSaveRenameCloudFolder : handleSaveRenameFolder}
                onCancelRename={() => setEditingFolderId(null)}
                onDeleteRequest={(id, name) => {
                  setDeleteConfirmTarget({
                    type: 'folder',
                    id,
                    title: name
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Uncategorized Lessons Section */}
      {hasLessons && (
        <div className="space-y-2.5">
          <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5 pl-1">
            <FileDown className="w-3.5 h-3.5" />
            <span>Bài chưa phân loại ({uncategorizedLessons.length})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorizedLessons.map(lesson => (
              <LessonCard
                key={lesson.id}
                id={lesson.id}
                title={lesson.title}
                rawText={lesson.rawText}
                createdAt={lesson.createdAt}
                speechList={lesson.speechList}
                settings={lesson.settings}
                isEditing={editingLessonId === lesson.id}
                editingTitleValue={editingLessonTitle}
                setEditingTitleValue={setEditingLessonTitle}
                onLoad={() => onLoadLesson(lesson)}
                onStartRename={handleStartRenameLesson}
                onSaveRename={() => {
                  if (activeTab === 'cloud') {
                    handleSaveRenameCloudLesson();
                  } else {
                    handleSaveRenameLesson();
                  }
                }}
                onCancelRename={() => setEditingLessonId(null)}
                onDeleteRequest={(id, title) => {
                  setDeleteConfirmTarget({
                    type: 'lesson',
                    id,
                    title
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
