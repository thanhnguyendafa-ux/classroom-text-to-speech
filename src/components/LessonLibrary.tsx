import React, { useState, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Save,
  FolderOpen,
  Sparkles,
  RefreshCw,
  FileDown,
  Cloud,
  Laptop,
  LogIn,
  Loader2,
  ArrowUpFromLine
} from 'lucide-react';

import { LessonDocument, LessonDraft, LessonSettings, SpeechItem } from '../types';
import { buildLessonDraft } from '../domain/lessonModel';
import { useAuth } from '../features/auth/useAuth';
import type { CloudLesson } from '../features/cloud-lessons/cloudLessonApi';

import { LibraryToolbar } from '../features/lessons/components/LibraryToolbar';
import { MigrationNotice } from '../features/lessons/components/MigrationNotice';
import { LibraryGallery } from '../features/lessons/components/LibraryGallery';
import { LibraryList } from '../features/lessons/components/LibraryList';
import type { SavedFolder, SavedLesson } from '../features/lessons/localLibraryRepository';
import { CreateFolderForm, SaveLessonForm } from '../features/lessons/LibraryForms';
import { LibraryDeleteDialog, type LibraryDeleteTarget } from '../features/lessons/LibraryDeleteDialog';
import { mergeLibraryBackup, parseLibraryBackup, serializeLibraryBackup } from '../features/lessons/libraryBackup';
import { useLessonLibraryDataController } from '../application/lesson-library/useLessonLibraryDataController';
import { createCloudLibraryActions } from '../application/lesson-library/createCloudLibraryActions';
import { createLocalLibraryActions } from '../application/lesson-library/createLocalLibraryActions';
export type { SavedFolder, SavedLesson } from '../features/lessons/localLibraryRepository';


interface LessonLibraryProps {
  currentRawText: string;
  currentSpeechList: SpeechItem[];
  currentSettings: LessonSettings;
  onLoadLesson: (lesson: SavedLesson) => void;
  cloudRefreshVersion?: number;
}

export default function LessonLibrary({
  currentRawText,
  currentSpeechList,
  currentSettings,
  onLoadLesson,
  cloudRefreshVersion
}: LessonLibraryProps) {
  const { user, signInWithGoogle } = useAuth();
  // UI toggles & input states
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');

  // Creation states
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [showSaveLessonForm, setShowSaveLessonForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string>('unassigned'); // 'unassigned' or folder ID
  const [showMigrationBanner, setShowMigrationBanner] = useState(true);

  // Custom Deletion Confirmation Modal target state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<LibraryDeleteTarget | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const flashMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const { source: activeTab, setSource: setActiveTab, folders: filteredFolders, uncategorized: filteredUncategorized, allFolders: displayFolders, allUncategorized: displayUncategorized, selectedFolderId, selectFolder: setSelectedFolderId, query: searchQuery, setQuery: setSearchQuery, viewMode, setViewMode, loadStatus, mutateLocal, refreshCloud: fetchCloudData, startCloudMutation, failCloudMutation, clearLocalAfterMigration } = useLessonLibraryDataController({ userId: user?.uid ?? null, refreshVersion: cloudRefreshVersion, onError: (message) => flashMessage(message, 'error') });
  const isCloudLoading = activeTab === 'cloud' && loadStatus === 'loading';
  const folders: SavedFolder[] = displayFolders;
  const uncategorizedLessons: SavedLesson[] = displayUncategorized;
  const cloudLessons: CloudLesson[] = [...displayFolders.flatMap(folder => folder.lessons), ...displayUncategorized];

  const cloudActions = createCloudLibraryActions({
    userId: user?.uid ?? null, newFolderName, editingFolderId, editingFolderName, editingLessonId, editingLessonTitle, newLessonTitle, currentRawText, currentSpeechList, currentSettings, targetFolderId, cloudLessons, folders, uncategorizedLessons,
    startMutation: startCloudMutation, failMutation: failCloudMutation, refresh: fetchCloudData, clearLocalAfterMigration, flash: flashMessage, onLoadLesson,
    setNewFolderName, setShowNewFolderInput, setEditingFolderId, setNewLessonTitle, setShowSaveLessonForm, setEditingLessonId, setActiveTab, setShowMigrationBanner, setExpandedFolders,
  });
  const handleCreateCloudFolder = cloudActions.createFolder;
  const handleSaveRenameCloudFolder = cloudActions.renameFolder;
  const handleDeleteCloudFolder = cloudActions.deleteFolder;
  const handleSaveCurrentCloudLesson = cloudActions.saveLesson;
  const handleDeleteCloudLesson = cloudActions.deleteLesson;
  const handleSaveRenameCloudLesson = cloudActions.renameLesson;
  const handleLoadCloudLesson = cloudActions.loadLesson;
  const handleMigrateLocalToCloud = cloudActions.migrate;

  // Persist through the scoped local-library repository.
  const saveToStorage = (updatedFolders: SavedFolder[], updatedUncategorized: SavedLesson[]) => {
    mutateLocal(() => ({ folders: updatedFolders, uncategorized: updatedUncategorized }));
  };

  const localActions = createLocalLibraryActions({
    folders, uncategorizedLessons, newFolderName, editingFolderId, editingFolderName, newLessonTitle, editingLessonId, editingLessonTitle, targetFolderId, currentRawText, currentSpeechList, currentSettings,
    save: saveToStorage, flash: flashMessage, onLoadLesson, setNewFolderName, setShowNewFolderInput, setEditingFolderId, setEditingFolderName, setNewLessonTitle, setShowSaveLessonForm, setEditingLessonId, setEditingLessonTitle, setExpandedFolders,
  });
  const handleCreateFolder = localActions.createFolder;
  const handleDeleteFolder = localActions.deleteFolder;
  const handleStartRenameFolder = localActions.startRenameFolder;
  const handleSaveRenameFolder = localActions.saveRenameFolder;
  const handleSaveCurrentLesson = localActions.saveLesson;
  const handleLoadLesson = localActions.loadLesson;
  const handleDeleteLesson = localActions.deleteLesson;
  const handleStartRenameLesson = localActions.startRenameLesson;
  const handleSaveRenameLesson = localActions.saveRenameLesson;

  // JSON Import & Export Backup management
  const handleExportBackup = () => {
    const stringified = serializeLibraryBackup({ folders, uncategorized: uncategorizedLessons });
    const blob = new Blob([stringified], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-baimau-giaoan-${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    flashMessage('Đã xuất file lưu trữ (.json) thành công!', 'success');
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = parseLibraryBackup(
          content,
          () => `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          Date.now(),
        );
        const merged = mergeLibraryBackup(
          { folders, uncategorized: uncategorizedLessons },
          imported,
        );
        saveToStorage(merged.folders, merged.uncategorized);
        flashMessage(`Đã nạp file thành công! Đồng bộ thêm ${imported.folders.length} thư mục & ${imported.uncategorized.length} bài học.`, 'success');
      } catch (err) {
        console.error('Error parsing imported file', err);
        flashMessage('Có lỗi xảy ra khi đọc file JSON!', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  return (
    <div id="lesson-library-container" className="text-left font-sans">

      {/* 1. Global Toolbar Component */}
      <LibraryToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSaveLessonForm={showSaveLessonForm}
        setShowSaveLessonForm={setShowSaveLessonForm}
        showNewFolderInput={showNewFolderInput}
        setShowNewFolderInput={setShowNewFolderInput}
        user={user}
        isCloudLoading={isCloudLoading}
        fetchCloudData={fetchCloudData}
        handleImportButtonClick={() => fileInputRef.current?.click()}
        handleExportBackup={handleExportBackup}
        fileInputRef={fileInputRef}
        handleImportFileChange={handleImportFileChange}
        hasItemsToSave={currentSpeechList.length > 0 || !!currentRawText.trim()}
      />

      {/* 2. Compact Migration Notice / Banner Component */}
      <MigrationNotice
        activeTab={activeTab}
        user={user}
        localFoldersCount={folders.length}
        localLessonsCount={uncategorizedLessons.length}
        isCloudLoading={isCloudLoading}
        handleMigrateLocalToCloud={handleMigrateLocalToCloud}
        showMigrationBanner={showMigrationBanner}
        setShowMigrationBanner={setShowMigrationBanner}
      />

      {/* 3. Inline Status Message Alert */}
      {statusMessage && (
        <div className={`p-2 px-3 rounded-xl text-xs font-semibold mb-3 animate-fadeIn ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100/60' :
          'bg-indigo-50 text-indigo-700 border border-indigo-100/60'
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* 4. Cloud Auth Prompt if Not Authenticated */}
      {activeTab === 'cloud' && !user && (
        <div id="cloud-auth-prompt" className="bg-slate-50/50 border border-slate-200/65 rounded-2xl p-6 text-center animate-fadeIn my-2">
          <Cloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-xs">Yêu cầu Đăng nhập Tài khoản</h4>
          <p className="text-slate-500 text-[10px] mt-1.5 max-w-[320px] mx-auto leading-relaxed">
            Đăng nhập bằng tài khoản Google để tự động sao lưu, tạo thư mục và đồng bộ các giáo án của bạn trên mọi thiết bị hoàn toàn miễn phí.
          </p>
          <button
            type="button"
            id="google-signin-btn"
            onClick={signInWithGoogle}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập bằng Google</span>
          </button>
        </div>
      )}

      <SaveLessonForm
        visible={((activeTab === 'local') || (activeTab === 'cloud' && !!user)) && showSaveLessonForm}
        title={newLessonTitle}
        folderId={targetFolderId}
        folders={activeTab === 'cloud' ? displayFolders : folders}
        onTitleChange={setNewLessonTitle}
        onFolderChange={setTargetFolderId}
        onCancel={() => setShowSaveLessonForm(false)}
        onSave={activeTab === 'cloud' ? handleSaveCurrentCloudLesson : handleSaveCurrentLesson}
      />
      <CreateFolderForm
        visible={((activeTab === 'local') || (activeTab === 'cloud' && !!user)) && showNewFolderInput}
        name={newFolderName}
        onNameChange={setNewFolderName}
        onCreate={activeTab === 'cloud' ? handleCreateCloudFolder : handleCreateFolder}
      />

      {/* 7. Loading state spinner */}
      {isCloudLoading && (
        <div id="library-loading-spinner" className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-[11px] font-bold">Đang cập nhật thư viện đám mây...</span>
        </div>
      )}

      {/* 8. Main Library Content Renderer (Gallery or List View) */}
      {!isCloudLoading && (activeTab !== 'cloud' || user) && (
        viewMode === 'gallery' ? (
          <LibraryGallery
            folders={filteredFolders}
            uncategorizedLessons={filteredUncategorized}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
            activeTab={activeTab}
            editingFolderId={editingFolderId}
            editingFolderName={editingFolderName}
            setEditingFolderName={setEditingFolderName}
            handleStartRenameFolder={handleStartRenameFolder}
            handleSaveRenameFolder={handleSaveRenameFolder}
            handleSaveRenameCloudFolder={handleSaveRenameCloudFolder}
            setEditingFolderId={setEditingFolderId}
            editingLessonId={editingLessonId}
            editingLessonTitle={editingLessonTitle}
            setEditingLessonTitle={setEditingLessonTitle}
            handleStartRenameLesson={handleStartRenameLesson}
            handleSaveRenameLesson={handleSaveRenameLesson}
            handleSaveRenameCloudLesson={handleSaveRenameCloudLesson}
            setEditingLessonId={setEditingLessonId}
            setDeleteConfirmTarget={setDeleteConfirmTarget}
            onLoadLesson={activeTab === 'cloud' ? handleLoadCloudLesson : handleLoadLesson}
          />
        ) : (
          <LibraryList
            folders={filteredFolders}
            uncategorizedLessons={filteredUncategorized}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
            activeTab={activeTab}
            editingFolderId={editingFolderId}
            editingFolderName={editingFolderName}
            setEditingFolderName={setEditingFolderName}
            handleStartRenameFolder={handleStartRenameFolder}
            handleSaveRenameFolder={handleSaveRenameFolder}
            handleSaveRenameCloudFolder={handleSaveRenameCloudFolder}
            setEditingFolderId={setEditingFolderId}
            editingLessonId={editingLessonId}
            editingLessonTitle={editingLessonTitle}
            setEditingLessonTitle={setEditingLessonTitle}
            handleStartRenameLesson={handleStartRenameLesson}
            handleSaveRenameLesson={handleSaveRenameLesson}
            handleSaveRenameCloudLesson={handleSaveRenameCloudLesson}
            setEditingLessonId={setEditingLessonId}
            setDeleteConfirmTarget={setDeleteConfirmTarget}
            onLoadLesson={activeTab === 'cloud' ? handleLoadCloudLesson : handleLoadLesson}
          />
        )
      )}

      <LibraryDeleteDialog
        target={deleteConfirmTarget}
        onCancel={() => setDeleteConfirmTarget(null)}
        onDeleteFolder={(target, keepLessons) => {
          if (activeTab === 'cloud') handleDeleteCloudFolder(target.id, keepLessons);
          else handleDeleteFolder(target.id, keepLessons);
          setDeleteConfirmTarget(null);
        }}
        onDeleteLesson={(target) => {
          if (activeTab === 'cloud') handleDeleteCloudLesson(target.id);
          else handleDeleteLesson(target.id, target.folderId);
          setDeleteConfirmTarget(null);
        }}
      />
    </div>
  );
}
