import type { Dispatch, SetStateAction } from 'react';
import type { LessonSettings, SpeechItem } from '../../types';
import { createFolder, createLesson, deleteFolder, deleteLesson, listFolders, listLessons, updateFolder, updateLesson, type CloudLesson } from '../../features/cloud-lessons/cloudLessonApi';
import { createCloudLibraryService } from '../../features/lessons/cloudLibraryService';
import { migrateLocalLibraryToCloud } from '../../features/lessons/libraryCloudMigration';
import type { SavedFolder, SavedLesson } from '../../features/lessons/localLibraryRepository';

const service = createCloudLibraryService({ listFolders, listLessons, createFolder, updateFolder, deleteFolder, createLesson, updateLesson, deleteLesson });
type Flash = (message: string, type: 'success' | 'error' | 'info') => void;
interface Input {
  userId: string | null; newFolderName: string; editingFolderId: string | null; editingFolderName: string; editingLessonId: string | null; editingLessonTitle: string; newLessonTitle: string; currentRawText: string; currentSpeechList: SpeechItem[]; currentSettings: LessonSettings; targetFolderId: string; cloudLessons: CloudLesson[]; folders: SavedFolder[]; uncategorizedLessons: SavedLesson[];
  startMutation: () => void; failMutation: () => void; refresh: () => Promise<void>; clearLocalAfterMigration: () => void; flash: Flash; onLoadLesson: (lesson: SavedLesson) => void;
  setNewFolderName: (value: string) => void; setShowNewFolderInput: (value: boolean) => void; setEditingFolderId: (value: string | null) => void; setNewLessonTitle: (value: string) => void; setShowSaveLessonForm: (value: boolean) => void; setEditingLessonId: (value: string | null) => void; setActiveTab: (value: 'local' | 'cloud') => void; setShowMigrationBanner: (value: boolean) => void; setExpandedFolders: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export function createCloudLibraryActions(input: Input) {
  const mutate = async (operation: () => Promise<void>, success: string, failure: string) => { input.startMutation(); try { await operation(); input.flash(success, 'success'); await input.refresh(); } catch (cause) { console.error(failure, cause); input.flash(failure, 'error'); input.failMutation(); } };
  return {
    createFolder: async () => { const name=input.newFolderName.trim(); if(!input.userId||!name)return; await mutate(async()=>{ await service.createFolder(input.userId!, `folder-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, name); input.setNewFolderName(''); input.setShowNewFolderInput(false); }, `Đã tạo thư mục đám mây "${name}"`, 'Không thể tạo thư mục trên đám mây.'); },
    renameFolder: async () => { const name=input.editingFolderName.trim(); if(!input.userId||!input.editingFolderId||!name)return; await mutate(async()=>{ await service.renameFolder(input.userId!, input.editingFolderId!, name); input.setEditingFolderId(null); }, 'Đã đổi tên thư mục đám mây.', 'Không thể đổi tên thư mục trên đám mây.'); },
    deleteFolder: async (folderId:string,keepLessons:boolean) => { if(!input.userId)return; await mutate(()=>service.deleteFolder(input.userId!,folderId,keepLessons,input.cloudLessons), keepLessons?'Đã xóa thư mục và giữ lại bài học.':'Đã xóa thư mục cùng toàn bộ bài học.', 'Không thể xóa thư mục đám mây.'); },
    saveLesson: async () => { const title=input.newLessonTitle.trim(); if(!input.userId)return; if(!title){input.flash('Vui lòng nhập tiêu đề cho bài giảng','error');return;} if(!input.currentRawText.trim()){input.flash('Nội dung bài học trống, không thể lưu!','error');return;} await mutate(async()=>{ await service.createLesson(input.userId!, `lesson-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, { title, rawText:input.currentRawText, speechList:input.currentSpeechList, settings:input.currentSettings, folderId:input.targetFolderId==='unassigned'?null:input.targetFolderId }); input.setNewLessonTitle(''); input.setShowSaveLessonForm(false); input.setExpandedFolders(current=>({...current,[input.targetFolderId]:true})); }, `Đã lưu bài học đám mây "${title}".`, 'Không thể lưu bài giảng lên đám mây.'); },
    deleteLesson: async (lessonId:string) => { if(!input.userId)return; await mutate(()=>service.deleteLesson(input.userId!,lessonId),'Đã xóa bài học đám mây.','Không thể xóa bài học đám mây.'); },
    renameLesson: async () => { const title=input.editingLessonTitle.trim(); if(!input.userId||!input.editingLessonId||!title)return; await mutate(async()=>{await service.renameLesson(input.userId!,input.editingLessonId!,title);input.setEditingLessonId(null);},'Đã đổi tên bài học đám mây.','Không thể đổi tên bài học đám mây.'); },
    loadLesson: (lesson:CloudLesson) => { input.onLoadLesson(lesson); input.flash(`Đã nạp bài học đám mây "${lesson.title}".`,'success'); document.getElementById('words-maker-box')?.scrollIntoView({behavior:'smooth',block:'start'}); },
    migrate: async () => { if(!input.userId)return; await mutate(async()=>{ await migrateLocalLibraryToCloud(input.userId!,{folders:input.folders,uncategorized:input.uncategorizedLessons},{createFolder,createLesson}); input.clearLocalAfterMigration(); input.setActiveTab('cloud'); input.setShowMigrationBanner(false); },'Đã chuyển thư viện lên đám mây.','Không thể đồng bộ dữ liệu lên đám mây.'); },
  };
}
