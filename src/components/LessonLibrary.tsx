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
  FileDown
} from 'lucide-react';

import { SpeechItem } from '../types';

export interface SavedLesson {
  id: string;
  title: string;
  rawText: string;
  speechList?: SpeechItem[];
  settings?: {
    speed?: number;
    timeBetweenLines?: number;
    rowLayoutMode?: 'below' | 'side';
    engineMode?: 'browser' | 'premium';
    selectedPremiumVoiceEn?: string;
    selectedPremiumVoiceVi?: string;
    selectedEnVoiceName?: string;
    selectedViVoiceName?: string;
    autoGroupSet?: boolean;
    setMultiplier?: number;
    useUniversalImage?: boolean;
    universalImageUrl?: string;
  };
  createdAt: number;
}

export interface SavedFolder {
  id: string;
  name: string;
  lessons: SavedLesson[];
  createdAt: number;
}

interface LessonLibraryProps {
  currentRawText: string;
  currentSpeechList: SpeechItem[];
  currentSettings: {
    speed: number;
    timeBetweenLines: number;
    rowLayoutMode: 'below' | 'side';
    engineMode: 'browser' | 'premium';
    selectedPremiumVoiceEn: string;
    selectedPremiumVoiceVi: string;
    selectedEnVoiceName: string;
    selectedViVoiceName: string;
    autoGroupSet: boolean;
    setMultiplier: number;
    useUniversalImage: boolean;
    universalImageUrl: string;
  };
  onLoadLesson: (lesson: SavedLesson) => void;
}

export default function LessonLibrary({ 
  currentRawText, 
  currentSpeechList, 
  currentSettings, 
  onLoadLesson 
}: LessonLibraryProps) {
  const [folders, setFolders] = useState<SavedFolder[]>([]);
  const [uncategorizedLessons, setUncategorizedLessons] = useState<SavedLesson[]>([]);
  
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
      const savedFoldersJson = localStorage.getItem('library_folders');
      const savedUncategorizedJson = localStorage.getItem('library_uncategorized');
      const seedVersion = localStorage.getItem('library_seed_version_v3');
      
      if (seedVersion === 'true' && (savedFoldersJson || savedUncategorizedJson)) {
        if (savedFoldersJson) {
          try {
            setFolders(JSON.parse(savedFoldersJson));
          } catch (e) {
            console.error('Error parsing library folders', e);
          }
        }
        if (savedUncategorizedJson) {
          try {
            setUncategorizedLessons(JSON.parse(savedUncategorizedJson));
          } catch (e) {
            console.error('Error parsing uncategorized lessons', e);
          }
        }
      } else {
        // Default seed datasets matching exactly: 1 folder, 2 files inside, 1 file outside (including English-Vietnamese & Chinese-Vietnamese)
        const defaultOuterText = 'sunflower\nhoa hướng dương\nbright sunflower\nhoa hướng dương rực rỡ\nI saw a bright sunflower. /1.5\nTôi đã thấy một bông hoa hướng dương rực rỡ.\nplanting sunflower seeds\ngieo hạt hoa hướng dương\nWe are planting sunflower seeds in the garden. ;2\nChúng tôi đang gieo hạt hoa hướng dương trong vườn.';
        
        const defaultNestedEnglishText = 'popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành\nI love eating delicious popcorn. /1.5\nMình rất thích ăn bắp rang ngon lành.\nsharing popcorn\nchia sẻ bắp rang\nWe are sharing popcorn while watching a movie. ;2\nChúng mình đang chung nhau ăn bắp rang khi xem phim.';
        
        const defaultNestedChineseText = '苹果\nquả táo\n红苹果\nquả táo màu đỏ\n我喜欢吃红苹果。 /1.5\nTài thích ăn quả táo màu đỏ.\n买新鲜苹果\nmua táo tươi ngon\n妈妈去超市买新鲜苹果。 ;2\nMẹ đi siêu thị mua táo tươi ngon.';

        const initialUncategorized: SavedLesson[] = [
          {
            id: `lesson-seed-outer-1`,
            title: 'Học Tiếng Anh Giao Tiếp (Mẫu Anh-Việt)',
            rawText: defaultOuterText,
            createdAt: Date.now() - 100000
          }
        ];
        
        const initialFolders: SavedFolder[] = [
          {
            id: 'folder-seed-v3',
            name: 'Khóa Học Song Ngữ Giao Tiếp',
            lessons: [
              {
                id: 'lesson-seed-nested-eng',
                title: 'Tiếng Anh Du Lịch (Mẫu Anh-Việt)',
                rawText: defaultNestedEnglishText,
                createdAt: Date.now() - 50000
              },
              {
                id: 'lesson-seed-nested-zho',
                title: 'Tiếng Trung Giao Tiếp (Mẫu Trung-Việt)',
                rawText: defaultNestedChineseText,
                createdAt: Date.now() - 10000
              }
            ],
            createdAt: Date.now()
          }
        ];
        
        setFolders(initialFolders);
        setUncategorizedLessons(initialUncategorized);
        localStorage.setItem('library_folders', JSON.stringify(initialFolders));
        localStorage.setItem('library_uncategorized', JSON.stringify(initialUncategorized));
        localStorage.setItem('library_seed_version_v3', 'true');
        
        // Expand the seed folder by default
        setExpandedFolders({ 'folder-seed-v3': true });
      }
    }
  }, []);

  const flashMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  // Helper to persist to localStorage
  const saveToStorage = (updatedFolders: SavedFolder[], updatedUncategorized: SavedLesson[]) => {
    localStorage.setItem('library_folders', JSON.stringify(updatedFolders));
    localStorage.setItem('library_uncategorized', JSON.stringify(updatedUncategorized));
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
    
    const newLesson: SavedLesson = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: trimmedTitle,
      rawText: currentRawText,
      speechList: currentSpeechList,
      settings: currentSettings,
      createdAt: Date.now()
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
                  existingFolder.lessons.push({
                    ...impL,
                    // safe fresh ID
                    id: `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
                  });
                }
              });
            } else {
              mergedFolders.push({
                ...impFold,
                id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
              });
            }
          });

          // Merge uncategorized
          let mergedUncategorized = [...uncategorizedLessons];
          importedUncategorized.forEach((impL: SavedLesson) => {
            if (!mergedUncategorized.some(l => l.title.toLowerCase() === impL.title.toLowerCase())) {
              mergedUncategorized.push({
                ...impL,
                id: `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
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

  return (
    <div id="lesson-library-card" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Thư Viện Bài Giảng & Thư Mục</h3>
            <p className="text-[10px] text-slate-550">Lưu trữ, sao lưu và quản lý các giáo án song ngữ của bạn</p>
          </div>
        </div>

        {/* Global actions: Backup, Import */}
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
            onClick={handleImportButtonClick}
            title="Import Thư Viện từ File .json"
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={handleExportBackup}
            title="Backup toàn bộ Thư Viện (.json)"
            className="p-1.5 hover:bg-slate-100 text-indigo-600 hover:text-indigo-700 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-2 rounded-lg text-xs font-semibold mb-3 ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
          'bg-indigo-50 text-indigo-700 border border-indigo-100'
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* Primary Actions Workspace */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            setShowSaveLessonForm(!showSaveLessonForm);
            setShowNewFolderInput(false);
          }}
          className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
            showSaveLessonForm
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-xs'
          }`}
        >
          {showSaveLessonForm ? (
            <>
              <X className="w-3.5 h-3.5" />
              Đóng form lưu
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Lưu bài hiện tại
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowNewFolderInput(!showNewFolderInput);
            setShowSaveLessonForm(false);
          }}
          className="px-3 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          Tạo thư mục mới
        </button>
      </div>

      {/* Form: Save Current Lesson */}
      {showSaveLessonForm && (
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mb-4 space-y-2.5 animate-fadeIn">
          <h4 className="text-xs font-bold text-indigo-850 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Lưu văn bản đang soạn thảo thành bài giảng mới:
          </h4>
          
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Tên bài học</label>
            <input 
              type="text" 
              placeholder="Ví dụ: Bài đọc quả táo, pop corn..."
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              className="w-full text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Chọn thư mục chứa</label>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="unassigned">-- Không xếp thư mục (Chưa phân loại) --</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="p-2 bg-white/70 border border-indigo-100 rounded-lg text-[10px] text-indigo-700 leading-relaxed font-medium">
            💡 <strong>Tự động lưu kèm:</strong> Toàn bộ cấu hình bài học (Tốc độ, thời gian nghỉ / delay, chế độ giọng đọc, tuỳ chọn giọng ngôn ngữ) cùng các liên kết <strong>hình ảnh của từng từ/câu thoại</strong> sẽ được tự động đính kèm và khôi phục khi nạp lại.
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowSaveLessonForm(false)}
              className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200/50 rounded-lg transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentLesson}
              className="px-3 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition"
            >
              Xác nhận lưu
            </button>
          </div>
        </div>
      )}

      {/* Form: Create Folder */}
      {showNewFolderInput && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 space-y-2.5 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-700">Tạo tên thư mục mới:</h4>
          <div className="flex gap-1.5">
            <input 
              type="text" 
              placeholder="Nhập tên thư mục..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 text-xs font-bold rounded-lg transition"
            >
              Tạo
            </button>
          </div>
        </div>
      )}

      {/* MAIN LIST OF FOLDERS & ACCORDIONS */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin pr-1">
        
        {folders.length === 0 && uncategorizedLessons.length === 0 && (
          <div className="text-center py-6 text-slate-450 text-xs">
            Thư viện trống. Hãy bắt đầu bằng cách lưu văn bản soạn thảo!
          </div>
        )}

        {/* Dynamic Folders */}
        {folders.map(folder => {
          const isExpanded = !!expandedFolders[folder.id];
          const isEditing = editingFolderId === folder.id;

          return (
            <div key={folder.id} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30">
              {/* Folder main bar */}
              <div 
                className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                onClick={() => {
                  if (!isEditing) toggleFolder(folder.id);
                }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className={isExpanded ? "text-indigo-600" : "text-slate-650"}>
                    <Folder className="w-4 h-4 fill-current opacity-80" />
                  </div>
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      className="text-xs bg-white border border-indigo-400 focus:ring-1 focus:ring-indigo-500 rounded p-1 font-bold text-slate-800 flex-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRenameFolder();
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {folder.name}
                      <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({folder.lessons.length} bài)</span>
                    </span>
                  )}
                </div>

                {/* Folder Actions */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button 
                        type="button" 
                        onClick={handleSaveRenameFolder}
                        className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingFolderId(null)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartRenameFolder(folder.id, folder.name)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="Đổi tên thư mục"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      
                      {/* Delete folder button with double options */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmTarget({
                            type: 'folder',
                            id: folder.id,
                            title: folder.name
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Xóa thư mục"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Folder child lessons block */}
              {isExpanded && (
                <div className="bg-white border-t border-slate-100/80 p-1.5 pl-5 space-y-1 animate-fadeIn duration-150">
                  {folder.lessons.length === 0 ? (
                    <div className="text-[10px] text-slate-400 py-2 pl-3">
                      Thư mục này rỗng. Nhấp "Lưu bài hiện tại" và chọn thư mục này để lưu.
                    </div>
                  ) : (
                    folder.lessons.map(lesson => {
                      const isLessonEditing = editingLessonId === lesson.id;
                      const lineCount = lesson.rawText.split('\n').filter(l => l.trim().length > 0).length;

                      return (
                        <div key={lesson.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 select-none group border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1.5">
                            <div className="text-slate-405 flex-shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>

                            {isLessonEditing ? (
                              <input
                                type="text"
                                value={editingLessonTitle}
                                onChange={(e) => setEditingLessonTitle(e.target.value)}
                                className="text-[11px] bg-white border border-indigo-400 rounded px-1.5 py-0.5 text-slate-800 flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRenameLesson(folder.id);
                                  if (e.key === 'Escape') setEditingLessonId(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleLoadLesson(lesson)}
                                title="Click để tải bài phát âm này lên bảng vẽ"
                              >
                                <span className="text-xs text-slate-650 hover:text-indigo-650 font-medium truncate block">
                                  {lesson.title}
                                </span>
                                <span className="text-[9px] text-slate-400 block">
                                  {lineCount} dòng • {new Date(lesson.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-80 md:opacity-40 group-hover:opacity-100 transition-opacity">
                            {isLessonEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveRenameLesson(folder.id)}
                                  className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLessonId(null)}
                                  className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleLoadLesson(lesson)}
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded text-[9px] font-bold px-1.5"
                                  title="Nạp bài giảng"
                                >
                                  Nạp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartRenameLesson(lesson.id, lesson.title)}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                  title="Đổi tên"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirmTarget({
                                      type: 'lesson',
                                      id: lesson.id,
                                      title: lesson.title,
                                      folderId: folder.id
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Xóa bài học"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized / No-Folder Lessons list */}
        {uncategorizedLessons.length > 0 && (
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
            <div className="p-2 flex items-center justify-between text-slate-500 text-xs font-bold leading-normal">
              <span className="flex items-center gap-1.5 pl-1.5">
                <FileDown className="w-4 h-4 text-slate-400" />
                Chưa Phân Loại
                <span className="text-[10px] text-slate-400 font-normal">({uncategorizedLessons.length} bài)</span>
              </span>
            </div>

            <div className="bg-white border-t border-slate-100 p-1.5 space-y-1">
              {uncategorizedLessons.map(lesson => {
                const isLessonEditing = editingLessonId === lesson.id;
                const lineCount = lesson.rawText.split('\n').filter(l => l.trim().length > 0).length;

                return (
                  <div key={lesson.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 select-none group border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1.5">
                      <div className="text-slate-400 flex-shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>

                      {isLessonEditing ? (
                        <input
                          type="text"
                          value={editingLessonTitle}
                          onChange={(e) => setEditingLessonTitle(e.target.value)}
                          className="text-[11px] bg-white border border-indigo-400 rounded px-1.5 py-0.5 text-slate-800 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameLesson();
                            if (e.key === 'Escape') setEditingLessonId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleLoadLesson(lesson)}
                          title="Click để tải bài phát âm này lên bảng vẽ"
                        >
                          <span className="text-xs text-slate-650 hover:text-indigo-650 font-medium truncate block">
                            {lesson.title}
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            {lineCount} dòng • {new Date(lesson.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 md:opacity-40 group-hover:opacity-100 transition-opacity">
                      {isLessonEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveRenameLesson()}
                            className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLessonId(null)}
                            className="p-1 text-rose-650 hover:bg-rose-50 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleLoadLesson(lesson)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded text-[9px] font-bold px-1.5"
                            title="Nạp bài giảng"
                          >
                            Nạp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartRenameLesson(lesson.id, lesson.title)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            title="Đổi tên"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmTarget({
                                type: 'lesson',
                                id: lesson.id,
                                title: lesson.title
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Xóa bài học"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Custom Deletion Confirmation Dialog Modal */}
      {deleteConfirmTarget && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 animate-scaleUp text-left">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900">
                  {deleteConfirmTarget.type === 'folder' ? 'Xác nhận xóa thư mục?' : 'Xác nhận xóa bài học?'}
                </h4>
                <p className="text-[11px] text-slate-550 mt-1.5 leading-relaxed">
                  {deleteConfirmTarget.type === 'folder' ? (
                    <>
                      Bạn đang xóa thư mục <strong className="text-slate-800">"{deleteConfirmTarget.title}"</strong>. Hãy chọn cách xử lý cho các bài học bên trong:
                    </>
                  ) : (
                    <>
                      Bạn có chắc chắn muốn xóa vĩnh viễn bài giảng <strong className="text-slate-800">"{deleteConfirmTarget.title}"</strong> không? Hành động này không thể hoàn tác.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 justify-end">
              {deleteConfirmTarget.type === 'folder' ? (
                <div className="space-y-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteFolder(deleteConfirmTarget.id, true);
                      setDeleteConfirmTarget(null);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 text-slate-700 rounded-lg text-[10px] font-semibold cursor-pointer text-center border border-transparent transition"
                  >
                    Xóa thư mục (Giữ các bài trong "Chưa Phân Loại")
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteFolder(deleteConfirmTarget.id, false);
                      setDeleteConfirmTarget(null);
                    }}
                    className="w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold cursor-pointer text-center transition"
                  >
                    Xóa tất cả (Thư mục & Bài học bên trong)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="w-full px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold cursor-pointer text-center transition"
                  >
                    Hủy bỏ
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer text-center transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteLesson(deleteConfirmTarget.id, deleteConfirmTarget.folderId);
                      setDeleteConfirmTarget(null);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold cursor-pointer text-center transition"
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
