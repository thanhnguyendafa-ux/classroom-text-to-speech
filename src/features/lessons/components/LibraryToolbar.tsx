import React from 'react';
import type { User } from 'firebase/auth';
import { 
  Cloud, 
  Laptop, 
  LayoutGrid, 
  List, 
  Search, 
  Plus, 
  FolderPlus, 
  Upload, 
  Download, 
  RefreshCw,
  X,
  Save
} from 'lucide-react';

interface LibraryToolbarProps {
  activeTab: 'local' | 'cloud';
  setActiveTab: (tab: 'local' | 'cloud') => void;
  viewMode: 'gallery' | 'list';
  setViewMode: (mode: 'gallery' | 'list') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSaveLessonForm: boolean;
  setShowSaveLessonForm: (show: boolean) => void;
  showNewFolderInput: boolean;
  setShowNewFolderInput: (show: boolean) => void;
  user: User | null;
  isCloudLoading: boolean;
  fetchCloudData: () => Promise<void>;
  handleImportButtonClick: () => void;
  handleExportBackup: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasItemsToSave: boolean;
}

export const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  showSaveLessonForm,
  setShowSaveLessonForm,
  showNewFolderInput,
  setShowNewFolderInput,
  user,
  isCloudLoading,
  fetchCloudData,
  handleImportButtonClick,
  handleExportBackup,
  fileInputRef,
  handleImportFileChange,
  hasItemsToSave
}) => {
  return (
    <div id="library-toolbar" className="space-y-3 pb-3 border-b border-slate-100 mb-4">
      {/* Tab Switcher & Import/Export/Sync Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto max-w-sm">
          <button
            type="button"
            id="tab-cloud-btn"
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition cursor-pointer select-none ${
              activeTab === 'cloud'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Tài khoản đám mây</span>
          </button>
          <button
            type="button"
            id="tab-local-btn"
            onClick={() => setActiveTab('local')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition cursor-pointer select-none ${
              activeTab === 'local'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Bản nháp trên máy này</span>
          </button>
        </div>

        {/* Global Utilities */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {activeTab === 'local' && (
            <div className="flex items-center gap-1.5">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <button 
                type="button"
                id="import-backup-btn"
                onClick={handleImportButtonClick}
                title="Import Thư Viện từ File .json"
                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                id="export-backup-btn"
                onClick={handleExportBackup}
                title="Backup toàn bộ Thư Viện (.json)"
                className="p-1.5 hover:bg-slate-100 text-indigo-600 hover:text-indigo-700 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'cloud' && user && (
            <button
              type="button"
              id="sync-cloud-btn"
              onClick={fetchCloudData}
              title="Đồng bộ lại thư viện đám mây"
              className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Gallery/List Mode Switcher */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
            <button
              type="button"
              id="toggle-gallery-mode"
              onClick={() => setViewMode('gallery')}
              className={`p-1 rounded-md transition cursor-pointer ${
                viewMode === 'gallery' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-650'
              }`}
              title="Chế độ Gallery (Thẻ lưới)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="toggle-list-mode"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-650'
              }`}
              title="Chế độ Danh sách"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input & Inline Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            id="library-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề bài học..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              id="clear-search-btn"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Create Folders & Lessons Actions */}
        {(activeTab === 'local' || (activeTab === 'cloud' && user)) && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="toolbar-save-lesson-btn"
              onClick={() => {
                setShowSaveLessonForm(!showSaveLessonForm);
                setShowNewFolderInput(false);
              }}
              className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                showSaveLessonForm
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-xs'
              }`}
            >
              {showSaveLessonForm ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng form lưu</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{activeTab === 'cloud' ? 'Lưu lên đám mây' : 'Lưu bản nháp'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="toolbar-create-folder-btn"
              onClick={() => {
                setShowNewFolderInput(!showNewFolderInput);
                setShowSaveLessonForm(false);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Thư mục</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
