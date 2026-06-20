import React from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpeechItem, LanguageCode } from '../types';
import { PlaybackController } from './PlaybackController';
import { SpeechItemRow } from './SpeechItemRow';

interface SpeechListBoardProps {
  speechList: SpeechItem[];
  rowLayoutMode: 'side' | 'below';
  toggleRowLayoutMode: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleExportData: () => void;
  triggerPlaylistDrill: () => void;
  handleStopAll: () => void;
  handleClearAll: () => void;
  autoAdvance: boolean;
  
  newRowText: string;
  setNewRowText: (val: string) => void;
  newRowLang: LanguageCode | 'auto';
  setNewRowLang: (val: LanguageCode | 'auto') => void;
  newRowRepeats: number;
  setNewRowRepeats: (val: number) => void;
  newRowDelay: number;
  setNewRowDelay: (val: number) => void;
  handleAddSingleRow: (e: React.FormEvent) => void;
  
  setIsShareModalOpen: (val: boolean) => void;
  setIsAudioExportModalOpen: (val: boolean) => void;
  handleApplyTemplate: (text: string) => void;
  
  // Row settings & playback
  playingItemId: string | null;
  currentRepeatIndex: number;
  waitingState: {
    isWaiting: boolean;
    remainingSec: number;
    itemId: string | null;
    type: 'repeat' | 'advance' | null;
  };
  editingItemId: string | null;
  editingText: string;
  setEditingText: (val: string) => void;
  startEditingRow: (item: SpeechItem) => void;
  saveEditedRow: (id: string) => void;
  setEditingItemId: (id: string | null) => void;
  
  // Drag & Drop
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDropRow: (e: React.DragEvent, index: number) => void;
  
  speed: number;
  handleSpeakItem: (item: SpeechItem) => void;
  handleClearImage: (id: string, e: React.MouseEvent) => void;
  setSelectedItemForImageSearch: (item: SpeechItem) => void;
  setIsImageSearchModalOpen: (val: boolean) => void;
  
  handleRowRepeatsChange: (id: string, repeats: number) => void;
  handleRowDelayChange: (id: string, delay: number) => void;
  handleRowSpeedChange: (id: string, speed: number) => void;
  handleRowLangChange: (id: string, lang: LanguageCode | 'auto') => void;
  handleJoinWithNext: (index: number) => void;
  handleDeleteRow: (id: string) => void;
  handleDuplicateSet: (setId: string) => void;
  handleUngroupSet: (setId: string) => void;
}

export const SpeechListBoard: React.FC<SpeechListBoardProps> = ({
  speechList,
  rowLayoutMode,
  toggleRowLayoutMode,
  fileInputRef,
  handleExportData,
  triggerPlaylistDrill,
  handleStopAll,
  handleClearAll,
  autoAdvance,
  newRowText,
  setNewRowText,
  newRowLang,
  setNewRowLang,
  newRowRepeats,
  setNewRowRepeats,
  newRowDelay,
  setNewRowDelay,
  handleAddSingleRow,
  setIsShareModalOpen,
  setIsAudioExportModalOpen,
  handleApplyTemplate,
  
  playingItemId,
  currentRepeatIndex,
  waitingState,
  editingItemId,
  editingText,
  setEditingText,
  startEditingRow,
  saveEditedRow,
  setEditingItemId,
  
  draggedIndex,
  dragOverIndex,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDropRow,
  
  speed,
  handleSpeakItem,
  handleClearImage,
  setSelectedItemForImageSearch,
  setIsImageSearchModalOpen,
  handleRowRepeatsChange,
  handleRowDelayChange,
  handleRowSpeedChange,
  handleRowLangChange,
  handleJoinWithNext,
  handleDeleteRow,
  handleDuplicateSet,
  handleUngroupSet,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      
      {/* Dynamic list controls & status banner */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md select-none">
            Tổng số: {speechList.length} dòng
          </span>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md select-none">
            🇺🇸 EN: {speechList.filter(item => item.resolvedLang === 'en').length}
          </span>
          <span className="text-[10px] font-bold text-rose-650 bg-rose-50 px-2 py-0.5 rounded-md select-none">
            🇻🇳 VI: {speechList.filter(item => item.resolvedLang === 'vi').length}
          </span>
          <span className="text-[10px] text-slate-400 italic select-none">
            (Kéo thả đổi vị trí)
          </span>
        </div>
      </div>

      <PlaybackController
        speechList={speechList}
        rowLayoutMode={rowLayoutMode}
        toggleRowLayoutMode={toggleRowLayoutMode}
        onImportClick={() => fileInputRef.current?.click()}
        onShareClick={() => setIsShareModalOpen(true)}
        onExportAudioClick={() => setIsAudioExportModalOpen(true)}
        onExportBackupClick={handleExportData}
        onPlayAll={triggerPlaylistDrill}
        onStopAll={handleStopAll}
        onClearAll={handleClearAll}
        autoAdvance={autoAdvance}
      />

      {/* Inline dynamic row direct addition form */}
      <form onSubmit={handleAddSingleRow} id="quick-add-form" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-2 font-sans animate-fade-in">
        <input
          id="quick-text-box"
          type="text"
          placeholder="Thêm nhanh từ/câu mục tiêu..."
          className="flex-1 bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-w-0"
          value={newRowText}
          onChange={(e) => setNewRowText(e.target.value)}
        />
        
        <div className="flex items-center space-x-1">
          <select
            id="quick-lang-select"
            className="bg-white border border-slate-200 text-[11px] rounded-lg p-1.5 text-slate-600 focus:outline-hidden cursor-pointer shrink-0"
            value={newRowLang}
            onChange={(e) => setNewRowLang(e.target.value as LanguageCode | 'auto')}
          >
            <option value="auto">🔮 Tự nhận diện</option>
            <option value="en">🇺🇸 Chỉ EN Voice</option>
            <option value="vi">🇻🇳 Chỉ VI Voice</option>
          </select>

          <select
            id="quick-repeats-select"
            className="bg-white border border-slate-200 text-[11px] rounded-lg p-1.5 text-slate-600 focus:outline-hidden cursor-pointer shrink-0"
            value={newRowRepeats}
            onChange={(e) => setNewRowRepeats(parseInt(e.target.value))}
            title="Số lần lặp mặc định"
          >
            <option value={1}>🔁 1 lần lặp</option>
            <option value={2}>🔁 2 lần lặp</option>
            <option value={3}>🔁 3 lần lặp</option>
            <option value={4}>🔁 4 lần lặp</option>
            <option value={5}>🔁 5 lần lặp</option>
          </select>

          <select
            id="quick-delay-select"
            className="bg-white border border-slate-200 text-[11px] rounded-lg p-1.5 text-slate-600 focus:outline-hidden cursor-pointer shrink-0"
            value={newRowDelay}
            onChange={(e) => setNewRowDelay(parseFloat(e.target.value))}
            title="Thời gian nghỉ sau câu này"
          >
            <option value={1.0}>⏱️ Nghỉ 1s</option>
            <option value={1.5}>⏱️ Nghỉ 1.5s</option>
            <option value={2.0}>⏱️ Nghỉ 2s</option>
            <option value={3.0}>⏱️ Nghỉ 3s</option>
            <option value={4.0}>⏱️ Nghỉ 4s</option>
            <option value={5.0}>⏱️ Nghỉ 5s</option>
            <option value={8.0}>⏱️ Nghỉ 8s</option>
            <option value={12.0}>⏱️ Nghỉ 12s</option>
          </select>

          <button
            id="submit-quick-button"
            type="submit"
            className="bg-indigo-600 text-white rounded-lg p-1.5 hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center shrink-0 w-8"
            title="Thêm dòng"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Speech Interactive rows list with Drag & Drop */}
      <div id="speech-rows-draggable-container" className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {speechList.length === 0 ? (
            <motion.div
              id="card-empty-feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-14 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Plus className="h-5 w-5 animate-pulse" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Chưa có loa tương tác nào!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Nhấn nút &quot;Tạo danh mục loa đọc&quot; ở cột trái để tách các câu hoặc thêm thủ công qua biểu mẫu phía trên.
              </p>
              <button
                type="button"
                onClick={() => handleApplyTemplate('popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành')}
                className="text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100/75 px-3.5 py-1.75 rounded-lg border border-indigo-100 transition whitespace-nowrap cursor-pointer"
              >
                Tải danh sách song ngữ mẫu
              </button>
            </motion.div>
          ) : (
            speechList.map((item, index) => (
              <SpeechItemRow
                key={item.id}
                item={item}
                index={index}
                rowLayoutMode={rowLayoutMode}
                playingItemId={playingItemId}
                currentRepeatIndex={currentRepeatIndex}
                waitingState={waitingState}
                editingItemId={editingItemId}
                editingText={editingText}
                setEditingText={setEditingText}
                startEditingRow={startEditingRow}
                saveEditedRow={saveEditedRow}
                setEditingItemId={setEditingItemId}
                draggedIndex={draggedIndex}
                dragOverIndex={dragOverIndex}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDropRow={handleDropRow}
                speechList={speechList}
                speed={speed}
                handleSpeakItem={handleSpeakItem}
                handleStopAll={handleStopAll}
                handleClearImage={handleClearImage}
                setSelectedItemForImageSearch={setSelectedItemForImageSearch}
                setIsImageSearchModalOpen={setIsImageSearchModalOpen}
                handleRowRepeatsChange={handleRowRepeatsChange}
                handleRowDelayChange={handleRowDelayChange}
                handleRowSpeedChange={handleRowSpeedChange}
                handleRowLangChange={handleRowLangChange}
                handleJoinWithNext={handleJoinWithNext}
                handleDeleteRow={handleDeleteRow}
                handleDuplicateSet={handleDuplicateSet}
                handleUngroupSet={handleUngroupSet}
              />
            ))
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
