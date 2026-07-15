import React, { useState, useEffect, useRef } from 'react';
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
import { buildLessonDraft, hydrateLessonDocument } from '../domain/lessonModel';
import { useAuth } from '../features/auth/useAuth';
import { 
  CloudFolder, 
  CloudLesson, 
  listFolders, 
  createFolder, 
  updateFolder, 
  deleteFolder, 
  listLessons, 
  createLesson, 
  updateLesson, 
  deleteLesson 
} from '../features/cloud-lessons/cloudLessonApi';

import { LibraryToolbar } from '../features/lessons/components/LibraryToolbar';
import { MigrationNotice } from '../features/lessons/components/MigrationNotice';
import { LibraryGallery } from '../features/lessons/components/LibraryGallery';
import { LibraryList } from '../features/lessons/components/LibraryList';
import { createBrowserLocalLibraryRepository, type SavedFolder, type SavedLesson } from '../features/lessons/localLibraryRepository';
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
  const localLibraryRepository = createBrowserLocalLibraryRepository(user ? user.uid : 'global');
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('cloud');
  const [cloudFolders, setCloudFolders] = useState<CloudFolder[]>([]);
  const [cloudLessons, setCloudLessons] = useState<CloudLesson[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState<boolean>(true);

  const [folders, setFolders] = useState<SavedFolder[]>([]);
  const [uncategorizedLessons, setUncategorizedLessons] = useState<SavedLesson[]>([]);

  // Gallery/List and Drilldown States
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>(() => {
    return localLibraryRepository.readViewMode();
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persist viewMode
  useEffect(() => {
    localLibraryRepository.writeViewMode(viewMode);
  }, [viewMode]);

  // Reset drilldown when activeTab switches
  useEffect(() => {
    setSelectedFolderId(null);
  }, [activeTab]);

  const fetchCloudData = async () => {
    if (!user) return;
    setIsCloudLoading(true);
    try {
      const [foldersData, lessonsData] = await Promise.all([
        listFolders(user.uid),
        listLessons(user.uid)
      ]);
      setCloudFolders(foldersData || []);
      setCloudLessons(lessonsData || []);
    } catch (err) {
      console.error('Error loading cloud library:', err);
      flashMessage('Không thể tải thư viện đám mây. Vui lòng kiểm tra lại!', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'cloud') {
      fetchCloudData();
    }
  }, [user, activeTab, cloudRefreshVersion]);
  
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

  // Custom Deletion Confirmation Modal target state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'lesson' | 'folder';
    id: string;
    title: string;
    folderId?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load library from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { snapshot, migrated } = localLibraryRepository.loadWithLegacyMigration();
      if (localLibraryRepository.isSeeded() || migrated) {
        setFolders(snapshot.folders);
        setUncategorizedLessons(snapshot.uncategorized);
      } else {
        // Default seed datasets matching exactly: 1 folder, 2 files inside, 1 file outside (including English-Vietnamese & Chinese-Vietnamese)
        const defaultOuterText = 'sunflower\nhoa hướng dương\nbright sunflower\nhoa hướng dương rực rỡ\nI saw a bright sunflower. /1.5\nTôi đã thấy một bông hoa hướng dương rực rỡ.\nplanting sunflower seeds\ngieo hạt hoa hướng dương\nWe are planting sunflower seeds in the garden. ;2\nChúng tôi đang gieo hạt hoa hướng dương trong vườn.';
        
        const defaultNestedEnglishText = 'popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành\nI love eating delicious popcorn. /1.5\nMình rất thích ăn bắp rang ngon lành.\nsharing popcorn\nchia sẻ bắp rang\nWe are sharing popcorn while watching a movie. ;2\nChúng mình đang chung nhau ăn bắp rang khi xem phim.';
        
        const defaultNestedChineseText = '苹果\nquả táo\n红苹果\nquả táo màu đỏ\n我喜欢吃红苹果。 /1.5\nTài thích ăn quả táo màu đỏ.\n买新鲜苹果\nmua táo tươi ngon\n妈妈去超市买新鲜苹果。 ;2\nMẹ đi siêu thị mua táo tươi ngon.';

        const initialUncategorized: SavedLesson[] = [
          hydrateLessonDocument('lesson-seed-outer-1', {
            title: 'Học Tiếng Anh Giao Tiếp (Mẫu Anh-Việt)',
            rawText: defaultOuterText,
            createdAt: Date.now() - 100000,
          })
        ];
        
        const initialFolders: SavedFolder[] = [
          {
            id: 'folder-seed-v3',
            name: 'Khóa Học Song Ngữ Giao Tiếp',
            lessons: [
              hydrateLessonDocument('lesson-seed-nested-eng', {
                title: 'Tiếng Anh Du Lịch (Mẫu Anh-Việt)',
                rawText: defaultNestedEnglishText,
                createdAt: Date.now() - 50000,
              }),
              hydrateLessonDocument('lesson-seed-nested-zho', {
                title: 'Tiếng Trung Giao Tiếp (Mẫu Trung-Việt)',
                rawText: defaultNestedChineseText,
                createdAt: Date.now() - 10000,
              })
            ],
            createdAt: Date.now()
          }
        ];
        
        setFolders(initialFolders);
        setUncategorizedLessons(initialUncategorized);
        localLibraryRepository.save({ folders: initialFolders, uncategorized: initialUncategorized });
        
        // Expand the seed folder by default
        setExpandedFolders({ 'folder-seed-v3': true });
      }
    }
  }, [user]);

  const flashMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  // --- Cloud Operations ---
  const handleCreateCloudFolder = async () => {
    if (!user) return;
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    
    setIsCloudLoading(true);
    try {
      const newId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await createFolder(user.uid, newId, trimmed);
      setNewFolderName('');
      setShowNewFolderInput(false);
      flashMessage(`Đã tạo thư mục đám mây "${trimmed}"`, 'success');
      await fetchCloudData();
    } catch (err) {
      console.error('Error creating cloud folder:', err);
      flashMessage('Không thể tạo thư mục trên đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleSaveRenameCloudFolder = async () => {
    if (!user || !editingFolderId) return;
    const trimmed = editingFolderName.trim();
    if (!trimmed) return;
    
    setIsCloudLoading(true);
    try {
      await updateFolder(user.uid, editingFolderId, trimmed);
      setEditingFolderId(null);
      flashMessage('Đã đổi tên thư mục đám mây thành công', 'success');
      await fetchCloudData();
    } catch (err) {
      console.error('Error renaming cloud folder:', err);
      flashMessage('Không thể đổi tên thư mục trên đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleDeleteCloudFolder = async (folderId: string, keepLessons: boolean) => {
    if (!user) return;
    setIsCloudLoading(true);
    try {
      if (keepLessons) {
        const lessonsInFolder = cloudLessons.filter(l => l.folderId === folderId);
        for (const lesson of lessonsInFolder) {
          await updateLesson(user.uid, lesson.id, { folderId: null });
        }
      } else {
        const lessonsInFolder = cloudLessons.filter(l => l.folderId === folderId);
        for (const lesson of lessonsInFolder) {
          await deleteLesson(user.uid, lesson.id);
        }
      }
      await deleteFolder(user.uid, folderId);
      flashMessage(keepLessons ? 'Đã xóa thư mục và giữ lại các bài học đám mây.' : 'Đã xóa thư mục cùng toàn bộ bài học trên đám mây.', 'info');
      await fetchCloudData();
    } catch (err) {
      console.error('Error deleting cloud folder:', err);
      flashMessage('Có lỗi xảy ra khi xóa thư mục đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleSaveCurrentCloudLesson = async () => {
    if (!user) return;
    const trimmedTitle = newLessonTitle.trim();
    if (!trimmedTitle) {
      flashMessage('Vui lòng nhập tiêu đề cho bài giảng', 'error');
      return;
    }
    
    if (!currentRawText.trim()) {
      flashMessage('Nội dung bài học trống, không thể lưu!', 'error');
      return;
    }
    
    setIsCloudLoading(true);
    try {
      const newId = `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await createLesson(user.uid, newId, {
        title: trimmedTitle,
        rawText: currentRawText,
        speechList: currentSpeechList,
        settings: currentSettings,
        folderId: targetFolderId === 'unassigned' ? null : targetFolderId
      });
      
      setNewLessonTitle('');
      setShowSaveLessonForm(false);
      flashMessage(`Đã lưu bài học đám mây "${trimmedTitle}" thành công!`, 'success');
      await fetchCloudData();
      setExpandedFolders(prev => ({ ...prev, [targetFolderId]: true }));
    } catch (err) {
      console.error('Error saving cloud lesson:', err);
      flashMessage('Không thể lưu bài giảng lên đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleDeleteCloudLesson = async (lessonId: string) => {
    if (!user) return;
    setIsCloudLoading(true);
    try {
      await deleteLesson(user.uid, lessonId);
      flashMessage('Đã xóa bài học đám mây', 'info');
      await fetchCloudData();
    } catch (err) {
      console.error('Error deleting cloud lesson:', err);
      flashMessage('Không thể xóa bài học đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleSaveRenameCloudLesson = async () => {
    if (!user || !editingLessonId) return;
    const trimmed = editingLessonTitle.trim();
    if (!trimmed) return;
    
    setIsCloudLoading(true);
    try {
      await updateLesson(user.uid, editingLessonId, { title: trimmed });
      setEditingLessonId(null);
      flashMessage('Đã đổi tên bài học đám mây', 'success');
      await fetchCloudData();
    } catch (err) {
      console.error('Error renaming cloud lesson:', err);
      flashMessage('Không thể đổi tên bài học đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleLoadCloudLesson = (lesson: CloudLesson) => {
    onLoadLesson(lesson);
    flashMessage(`Đã nạp bài học đám mây "${lesson.title}" thành công!`, 'success');
    const mainEl = document.getElementById('words-maker-box');
    if (mainEl) {
      mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleMigrateLocalToCloud = async () => {
    if (!user) return;
    setIsCloudLoading(true);
    try {
      await Promise.all([
        ...folders.map(async folder => {
          await createFolder(user.uid, folder.id, folder.name);
          await Promise.all(folder.lessons.map(lesson => createLesson(user.uid, lesson.id, {
            title: lesson.title,
            rawText: lesson.rawText,
            speechList: lesson.speechList || [],
            settings: lesson.settings || {},
            folderId: folder.id
          })));
        }),
        ...uncategorizedLessons.map(lesson => createLesson(user.uid, lesson.id, {
          title: lesson.title,
          rawText: lesson.rawText,
          speechList: lesson.speechList || [],
          settings: lesson.settings || {},
          folderId: null
        }))
      ]);

      await fetchCloudData();
      localLibraryRepository.clear();
      localLibraryRepository.markCloudMigrated();
      setFolders([]);
      setUncategorizedLessons([]);
      setActiveTab('cloud');
      setShowMigrationBanner(false);
      flashMessage('Đã chuyển toàn bộ thư mục & bài giảng lên đám mây. Thư viện đám mây hiện là dữ liệu chính.', 'success');
    } catch (err) {
      console.error('Migration error:', err);
      flashMessage('Đã xảy ra lỗi khi đồng bộ dữ liệu lên đám mây.', 'error');
    } finally {
      setIsCloudLoading(false);
    }
  };

  // Persist through the scoped local-library repository.
  const saveToStorage = (updatedFolders: SavedFolder[], updatedUncategorized: SavedLesson[]) => {
    localLibraryRepository.save({ folders: updatedFolders, uncategorized: updatedUncategorized });
  };

  // Folders management
  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    
    const newFolder: SavedFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      lessons: [],
      createdAt: Date.now()
    };
    
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveToStorage(updated, uncategorizedLessons);
    setNewFolderName('');
    setShowNewFolderInput(false);
    flashMessage(`Đã tạo thư mục "${trimmed}"`, 'success');
  };

  const handleDeleteFolder = (folderId: string, keepLessons: boolean) => {
    const targetFolder = folders.find(f => f.id === folderId);
    if (!targetFolder) return;
    
    let updatedUncategorized = [...uncategorizedLessons];
    if (keepLessons && targetFolder.lessons.length > 0) {
      updatedUncategorized = [...updatedUncategorized, ...targetFolder.lessons];
    }
    
    const updatedFolders = folders.filter(f => f.id !== folderId);
    
    setFolders(updatedFolders);
    setUncategorizedLessons(updatedUncategorized);
    saveToStorage(updatedFolders, updatedUncategorized);
    flashMessage(keepLessons ? `Đã xóa thư mục và giữ lại các bài học.` : `Đã xóa thư mục cùng toàn bộ bài học bên trong.`, 'info');
  };

  const handleStartRenameFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
  };

  const handleSaveRenameFolder = () => {
    const trimmed = editingFolderName.trim();
    if (!trimmed || !editingFolderId) return;
    
    const updated = folders.map(f => f.id === editingFolderId ? { ...f, name: trimmed } : f);
    setFolders(updated);
    saveToStorage(updated, uncategorizedLessons);
    setEditingFolderId(null);
    flashMessage('Đã đổi tên thư mục thành công', 'success');
  };

  // Toggle Folder Accordion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Lessons management within active editor
  const handleSaveCurrentLesson = () => {
    const trimmedTitle = newLessonTitle.trim();
    if (!trimmedTitle) {
      flashMessage('Vui lòng nhập tiêu đề cho bài giảng', 'error');
      return;
    }
    
    if (!currentRawText.trim()) {
      flashMessage('Nội dung bài học trống, không thể lưu!', 'error');
      return;
    }
    
    const now = Date.now();
    const draft = buildLessonDraft({
      title: trimmedTitle,
      rawText: currentRawText,
      speechList: currentSpeechList,
      settings: currentSettings,
      folderId: targetFolderId === 'unassigned' ? null : targetFolderId,
    });

    const newLesson: SavedLesson = {
      schemaVersion: 1,
      revision: 1,
      id: `lesson-${now}-${Math.random().toString(36).substring(2, 7)}`,
      ...draft,
      createdAt: now,
      updatedAt: now,
    };
    
    if (targetFolderId === 'unassigned') {
      const updatedUncategorized = [newLesson, ...uncategorizedLessons];
      setUncategorizedLessons(updatedUncategorized);
      saveToStorage(folders, updatedUncategorized);
    } else {
      const updatedFolders = folders.map(f => {
        if (f.id === targetFolderId) {
          return { ...f, lessons: [newLesson, ...f.lessons] };
        }
        return f;
      });
      setFolders(updatedFolders);
      saveToStorage(updatedFolders, uncategorizedLessons);
      // Ensure folder is expanded to show newly added item
      setExpandedFolders(prev => ({ ...prev, [targetFolderId]: true }));
    }
    
    setNewLessonTitle('');
    setShowSaveLessonForm(false);
    flashMessage(`Đã lưu "${trimmedTitle}" kèm mọi cài đặt & hình ảnh thành công!`, 'success');
  };

  // Load a lesson into rawText & trigger speechList reconstruction
  const handleLoadLesson = (lesson: SavedLesson) => {
    onLoadLesson(lesson);
    flashMessage(`Đã khôi phục bài học "${lesson.title}" cùng toàn bộ cài đặt & hình ảnh!`, 'success');
    
    // Auto-scroll to top to view layout or player is good UX
    const mainEl = document.getElementById('words-maker-box');
    if (mainEl) {
      mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteLesson = (lessonId: string, folderId?: string) => {
    if (folderId) {
      const updated = folders.map(f => {
        if (f.id === folderId) {
          return { ...f, lessons: f.lessons.filter(l => l.id !== lessonId) };
        }
        return f;
      });
      setFolders(updated);
      saveToStorage(updated, uncategorizedLessons);
    } else {
      const updatedUncategorized = uncategorizedLessons.filter(l => l.id !== lessonId);
      setUncategorizedLessons(updatedUncategorized);
      saveToStorage(folders, updatedUncategorized);
    }
    flashMessage('Đã xóa bài học khỏi thư viện', 'info');
  };

  const handleStartRenameLesson = (lessonId: string, currentTitle: string) => {
    setEditingLessonId(lessonId);
    setEditingLessonTitle(currentTitle);
  };

  const handleSaveRenameLesson = (folderId?: string) => {
    const trimmed = editingLessonTitle.trim();
    if (!trimmed || !editingLessonId) return;
    
    if (folderId) {
      const updated = folders.map(f => {
        if (f.id === folderId) {
          return {
            ...f,
            lessons: f.lessons.map(l => l.id === editingLessonId ? { ...l, title: trimmed } : l)
          };
        }
        return f;
      });
      setFolders(updated);
      saveToStorage(updated, uncategorizedLessons);
    } else {
      const updatedUncategorized = uncategorizedLessons.map(l => 
        l.id === editingLessonId ? { ...l, title: trimmed } : l
      );
      setUncategorizedLessons(updatedUncategorized);
      saveToStorage(folders, updatedUncategorized);
    }
    
    setEditingLessonId(null);
    flashMessage('Đã đổi tên bài học', 'success');
  };

  // JSON Import & Export Backup management
  const handleExportBackup = () => {
    const dataObj = {
      appId: 'classroom-speech-pro-backup',
      version: 1,
      exportedAt: Date.now(),
      folders,
      uncategorized: uncategorizedLessons
    };
    
    const stringified = JSON.stringify(dataObj, null, 2);
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
        const parsed = JSON.parse(content);
        
        // Basic schema checks
        if (parsed && (Array.isArray(parsed.folders) || Array.isArray(parsed.uncategorized))) {
          const importedFolders = parsed.folders || [];
          const importedUncategorized = parsed.uncategorized || [];
          
          // Merge folders logic
          let mergedFolders = [...folders];
          importedFolders.forEach((impFold: SavedFolder) => {
            // Check if folder name already exists - if so, append lessons, else add folder
            const existingFolder = mergedFolders.find(f => f.name.toLowerCase() === impFold.name.toLowerCase());
            if (existingFolder) {
              // Add non-duplicate lessons
              impFold.lessons.forEach(impL => {
                if (!existingFolder.lessons.some(l => l.title.toLowerCase() === impL.title.toLowerCase())) {
                  const hydrated = hydrateLessonDocument(
                    `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    impL
                  );

                  existingFolder.lessons.push({
                    ...hydrated,
                    folderId: existingFolder.id,
                  });
                }
              });
            } else {
              mergedFolders.push({
                id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                name: typeof impFold.name === 'string' ? impFold.name : 'Thư mục đã nhập',
                createdAt: typeof impFold.createdAt === 'number' ? impFold.createdAt : Date.now(),
                lessons: Array.isArray(impFold.lessons)
                  ? impFold.lessons.map((lesson) => hydrateLessonDocument(
                      `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      lesson
                    ))
                  : [],
              });
            }
          });

          // Merge uncategorized
          let mergedUncategorized = [...uncategorizedLessons];
          importedUncategorized.forEach((impL: SavedLesson) => {
            if (!mergedUncategorized.some(l => l.title.toLowerCase() === impL.title.toLowerCase())) {
              const hydrated = hydrateLessonDocument(
                `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                impL
              );

              mergedUncategorized.push({
                ...hydrated,
                folderId: null,
              });
            }
          });

          setFolders(mergedFolders);
          setUncategorizedLessons(mergedUncategorized);
          saveToStorage(mergedFolders, mergedUncategorized);
          flashMessage(`Đã nạp file thành công! Đồng bộ thêm ${importedFolders.length} thư mục & ${importedUncategorized.length} bài học.`, 'success');
        } else {
          flashMessage('Định dạng file sao lưu không hợp lệ. Vui lòng kiểm tra lại!', 'error');
        }
      } catch (err) {
        console.error('Error parsing imported file', err);
        flashMessage('Có lỗi xảy ra khi đọc file JSON!', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Calculate display and filtered items
  const displayFolders = activeTab === 'cloud' 
    ? cloudFolders.map(cf => ({
        id: cf.id,
        name: cf.name,
        lessons: cloudLessons.filter(cl => cl.folderId === cf.id).map(cl => ({
          id: cl.id,
          title: cl.title,
          rawText: cl.rawText,
          speechList: cl.speechList,
          settings: cl.settings,
          createdAt: cl.createdAt
        }))
      }))
    : folders;

  const displayUncategorized = activeTab === 'cloud'
    ? cloudLessons.filter(cl => cl.folderId === null).map(cl => ({
        id: cl.id,
        title: cl.title,
        rawText: cl.rawText,
        speechList: cl.speechList,
        settings: cl.settings,
        createdAt: cl.createdAt
      }))
    : uncategorizedLessons;

  const filteredFolders = displayFolders.map(f => {
    const matchedLessons = f.lessons.filter((l: any) => 
      l.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...f,
      lessons: matchedLessons
    };
  }).filter(f => {
    const folderNameMatch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return folderNameMatch || f.lessons.length > 0;
  });

  const filteredUncategorized = displayUncategorized.filter((l: any) => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* 5. Save Current Lesson Form */}
      {((activeTab === 'local') || (activeTab === 'cloud' && user)) && showSaveLessonForm && (
        <div id="save-lesson-form" className="p-4 bg-indigo-50/40 border border-indigo-100/60 rounded-xl mb-4 space-y-3 animate-fadeIn">
          <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lưu văn bản đang soạn thành bài giảng mới:</span>
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-1">Tên bài học</label>
              <input 
                type="text" 
                id="save-lesson-title-input"
                placeholder="Ví dụ: Bài đọc quả táo, Tiếng Anh Du Lịch..."
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                className="w-full text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-1">Thư mục chứa</label>
              <select
                id="save-lesson-folder-select"
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="unassigned">-- Chưa phân loại (Bài lẻ) --</option>
                {activeTab === 'cloud' ? (
                  cloudFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))
                ) : (
                  folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="text-[10px] text-indigo-700/80 leading-relaxed font-medium bg-white/50 border border-indigo-100/40 p-2.5 rounded-lg">
            💡 Tự động đính kèm và đồng bộ: Tốc độ đọc, thời gian nghỉ, giọng đọc và các liên kết hình ảnh minh họa cho từng từ thoại.
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              id="cancel-save-lesson-btn"
              onClick={() => setShowSaveLessonForm(false)}
              className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              id="submit-save-lesson-btn"
              onClick={activeTab === 'cloud' ? handleSaveCurrentCloudLesson : handleSaveCurrentLesson}
              className="px-3.5 py-1.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition cursor-pointer"
            >
              Lưu bài giảng
            </button>
          </div>
        </div>
      )}

      {/* 6. Create Folder Form */}
      {((activeTab === 'local') || (activeTab === 'cloud' && user)) && showNewFolderInput && (
        <div id="create-folder-form" className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl mb-4 space-y-2.5 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-700">Tạo thư mục mới trong thư viện:</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              id="new-folder-name-input"
              placeholder="Ví dụ: Du lịch, Giao tiếp song ngữ..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'cloud' ? handleCreateCloudFolder() : handleCreateFolder())}
            />
            <button
              type="button"
              id="submit-create-folder-btn"
              onClick={activeTab === 'cloud' ? handleCreateCloudFolder : handleCreateFolder}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Tạo mới
            </button>
          </div>
        </div>
      )}

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

      {/* 9. Custom Deletion Confirmation Dialog Modal */}
      {deleteConfirmTarget && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-150 animate-scaleUp text-left">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-extrabold text-slate-900">
                  {deleteConfirmTarget.type === 'folder' ? 'Xác nhận xóa thư mục?' : 'Xác nhận xóa bài học?'}
                </h4>
                <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {deleteConfirmTarget.type === 'folder' ? (
                    <>
                      Bạn đang xóa thư mục <strong className="text-slate-850">"{deleteConfirmTarget.title}"</strong>. Hãy chọn cách xử lý cho các bài học bên trong:
                    </>
                  ) : (
                    <>
                      Bạn có chắc chắn muốn xóa vĩnh viễn bài giảng <strong className="text-slate-850">"{deleteConfirmTarget.title}"</strong> không? Hành động này không thể hoàn tác.
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 justify-end">
              {deleteConfirmTarget.type === 'folder' ? (
                <div className="space-y-1.5 w-full">
                  <button
                    type="button"
                    id="confirm-delete-folder-keep-lessons-btn"
                    onClick={() => {
                      if (activeTab === 'cloud') {
                        handleDeleteCloudFolder(deleteConfirmTarget.id, true);
                      } else {
                        handleDeleteFolder(deleteConfirmTarget.id, true);
                      }
                      setDeleteConfirmTarget(null);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer text-center border border-transparent transition"
                  >
                    Xóa thư mục (Giữ các bài trong "Chưa Phân Loại")
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-folder-all-btn"
                    onClick={() => {
                      if (activeTab === 'cloud') {
                        handleDeleteCloudFolder(deleteConfirmTarget.id, false);
                      } else {
                        handleDeleteFolder(deleteConfirmTarget.id, false);
                      }
                      setDeleteConfirmTarget(null);
                    }}
                    className="w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer text-center transition"
                  >
                    Xóa tất cả (Thư mục & Bài học bên trong)
                  </button>
                  <button
                    type="button"
                    id="cancel-delete-folder-btn"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="w-full px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold cursor-pointer text-center transition"
                  >
                    Hủy bỏ
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    id="cancel-delete-lesson-btn"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[10px] font-bold cursor-pointer text-center transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-lesson-btn"
                    onClick={() => {
                      if (activeTab === 'cloud') {
                        handleDeleteCloudLesson(deleteConfirmTarget.id);
                      } else {
                        handleDeleteLesson(deleteConfirmTarget.id, deleteConfirmTarget.folderId);
                      }
                      setDeleteConfirmTarget(null);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer text-center transition"
                  >
                    Xóa vĩnh viễn
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
