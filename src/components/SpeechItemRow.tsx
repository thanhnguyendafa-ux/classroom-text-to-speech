import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Trash2, 
  X, 
  Check, 
  Edit2, 
  Trash,
  GripVertical,
  Link,
  Unlink,
  Copy
} from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';

interface SpeechItemRowProps {
  item: SpeechItem;
  index: number;
  rowLayoutMode: 'side' | 'below';
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
  
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDropRow: (e: React.DragEvent, index: number) => void;
  
  speechList: SpeechItem[];
  speed: number;
  
  handleSpeakItem: (item: SpeechItem) => void;
  handleStopAll: () => void;
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

export const SpeechItemRow: React.FC<SpeechItemRowProps> = ({
  item,
  index,
  rowLayoutMode,
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
  speechList,
  speed,
  handleSpeakItem,
  handleStopAll,
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
  const isItemPlaying = playingItemId === item.id;
  const isEditing = editingItemId === item.id;
  const isBeingDragged = draggedIndex === index;
  const isOverThisRow = dragOverIndex === index && draggedIndex !== index;

  const isSetStart = item.setId ? (index === 0 || speechList[index - 1].setId !== item.setId) : false;
  const isSetEnd = item.setId ? (index === speechList.length - 1 || speechList[index + 1].setId !== item.setId) : false;

  // Style variants for contiguous sets
  let customRoundedStyle = 'rounded-xl';
  let customBorderStyle = isItemPlaying 
    ? 'bg-indigo-50/70 border-indigo-350 ring-2 ring-indigo-500/10 shadow-xs' 
    : isBeingDragged
      ? 'bg-indigo-50/20 border-dashed border-indigo-300 opacity-40'
      : 'bg-white border-slate-200 hover:border-slate-350 shadow-3xs';

  if (item.setId) {
    const setBorder = isItemPlaying
      ? 'border-indigo-400 ring-2 ring-indigo-500/10 shadow-xs'
      : isOverThisRow
        ? 'border-indigo-450 ring-2 ring-indigo-600/15'
        : isBeingDragged
          ? 'border-dashed border-indigo-300 opacity-40'
          : 'border-indigo-200 hover:border-indigo-300 shadow-3xs';

    const setBg = isItemPlaying
      ? 'bg-indigo-50/60'
      : 'bg-indigo-50/15 hover:bg-indigo-50/25';

    customBorderStyle = `${setBorder} ${setBg}`;

    if (isSetStart && isSetEnd) {
      customRoundedStyle = 'rounded-xl';
    } else if (isSetStart) {
      customRoundedStyle = 'rounded-t-xl border-b-0';
    } else if (isSetEnd) {
      customRoundedStyle = 'rounded-b-xl';
    } else {
      customRoundedStyle = 'rounded-none border-t-0 border-b-0';
    }
  } else if (isOverThisRow) {
    customBorderStyle = 'border-indigo-400 ring-2 ring-indigo-600/10 scale-[1.01] bg-white';
  }

  // 1. Left elements (Grip, Index, Play speaker button, Text word inline edit, Repeating wave indicator)
  const renderLeftElements = () => (
    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
      {/* Grip handle and order numbering */}
      <div 
        className="flex items-center space-x-1 shrink-0 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 p-1"
        title="Ấn giữ để kéo thả đổi vị trí câu"
      >
        <GripVertical className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-mono font-bold w-4 text-center">
          {index + 1}
        </span>
        {item.setId && (
          <Link className="w-3 h-3 text-indigo-500 shrink-0 select-none" title="Đã gom nhóm thành Set song ngữ" />
        )}
      </div>

      {/* Image thumbnail placeholder slot */}
      <div 
        onClick={() => {
          setSelectedItemForImageSearch(item);
          setIsImageSearchModalOpen(true);
        }}
        className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex flex-col items-center justify-center relative cursor-pointer hover:border-indigo-400 group/thumb shadow-3xs transition-all"
        title="Nhấp để tìm kiếm hoặc chèn hình ảnh gán cho câu này"
      >
        {item.imageUrl ? (
          <>
            <img 
              src={item.imageUrl} 
              className="w-full h-full object-cover" 
              alt="word cover"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={(e) => handleClearImage(item.id, e)}
              className="absolute -top-1 -right-1 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full hidden group-hover/thumb:block shadow-xs scale-90 cursor-pointer z-10 animate-fade-in"
              title="Xoá ảnh"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 group-hover/thumb:text-indigo-600 transition">
            <Volume2 className="w-3.5 h-3.5" />
            <span className="text-[8px] font-extrabold uppercase tracking-tight mt-0.5">Tìm ảnh</span>
          </div>
        )}
      </div>

      {/* Speaker action key */}
      <button
        id={`trigger-btn-${item.id}`}
        onClick={() => {
          if (isItemPlaying) {
            handleStopAll();
          } else {
            handleSpeakItem(item);
          }
        }}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-all duration-150 cursor-pointer ${
          isItemPlaying
            ? 'bg-rose-500 text-white scale-105 hover:bg-rose-600'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 active:scale-95'
        }`}
        title={isItemPlaying ? 'Click để ngừng đọc dòng này' : 'Click để đọc phát âm dòng'}
      >
        {isItemPlaying ? (
          <VolumeX className="w-4 h-4 animate-bounce" />
        ) : (
          <Volume2 className="w-4.5 h-4.5" />
        )}
      </button>

      {/* Text word row or editor */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              id={`inline-text-edit-${item.id}`}
              type="text"
              className="w-full bg-white border border-indigo-400 rounded-md px-1.5 py-0.5 text-xs text-slate-800 focus:outline-hidden"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditedRow(item.id);
                if (e.key === 'Escape') setEditingItemId(null);
              }}
              autoFocus
            />
            <button
              id={`save-btn-${item.id}`}
              onClick={() => saveEditedRow(item.id)}
              type="button"
              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              id={`cancel-btn-${item.id}`}
              onClick={() => setEditingItemId(null)}
              type="button"
              className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="group/word flex items-center space-x-1.5">
            <span
              onClick={() => startEditingRow(item)}
              className={`text-xs sm:text-sm font-semibold tracking-tight text-left select-none break-all cursor-pointer rounded px-1 -mx-1 hover:bg-amber-50 ${
                isItemPlaying ? 'text-indigo-950 font-bold underline decoration-indigo-400 decoration-2' : 'text-slate-800'
              }`}
              title="Nháy đúp hoặc click để sửa trực tiếp câu từ"
            >
              {item.text}
            </span>
            <button
              onClick={() => startEditingRow(item)}
              className="opacity-0 group-hover/word:opacity-60 hover:!opacity-100 p-0.5 text-slate-400 transition cursor-pointer"
              title="Sửa từ"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Iteration/Repeat tracker bubble visualization */}
        {isItemPlaying && (
          <div className="flex items-center space-x-1.5 mt-1.5 h-3.5" id={`waves-layout-${item.id}`}>
            {waitingState.isWaiting && waitingState.itemId === item.id ? (
              <>
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2 animate-pulse uppercase flex items-center gap-1">
                  ⏱️ {waitingState.type === 'repeat' ? 'Chờ lặp' : 'Chờ chuyển câu'}: {waitingState.remainingSec}s
                </span>
              </>
            ) : (
              <>
                <span className="w-0.5 bg-indigo-600 rounded-full animate-pulse h-2.5 animate-bounce"></span>
                <span className="w-0.5 bg-indigo-600 rounded-full animate-pulse h-1.5"></span>
                <span className="w-0.5 bg-indigo-600 rounded-full animate-pulse h-3"></span>
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 rounded px-1.5 py-0.2 animate-pulse uppercase col-span-3">
                  Đang phát (Lần {currentRepeatIndex}/{item.repeats || 1})
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // 2. Right configuration widget groups (Repeats, Pause delay, Speed override, Engine selection)
  const renderConfigElements = () => (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {/* Repetitions counter controller */}
      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5 sm:p-1" title="Số lần tự phát lại dòng này">
        <span className="text-[10px] text-slate-400 font-bold mr-0.5 pl-0.5">Lặp:</span>
        <button
          type="button"
          onClick={() => handleRowRepeatsChange(item.id, (item.repeats || 1) - 1)}
          className="w-5 h-5 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white hover:bg-slate-150 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer active:scale-90"
        >
          -
        </button>
        <span className="text-[10px] sm:text-[11px] font-mono font-extrabold text-slate-800 min-w-[12px] text-center">
          {item.repeats || 1}
        </span>
        <button
          type="button"
          onClick={() => handleRowRepeatsChange(item.id, (item.repeats || 1) + 1)}
          className="w-5 h-5 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white hover:bg-slate-150 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer active:scale-90"
        >
          +
        </button>
      </div>

      {/* Individual delay timer controller */}
      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5 sm:p-1" title="Thời gian chờ nghỉ sau khi đọc hết câu này">
        <span className="text-[10px] text-slate-400 font-bold mr-0.5 pl-0.5">Nghỉ:</span>
        <button
          type="button"
          onClick={() => handleRowDelayChange(item.id, (item.delaySec !== undefined ? item.delaySec : 2.0) - 0.5)}
          className="w-5 h-5 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white hover:bg-slate-150 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer active:scale-90"
        >
          -
        </button>
        <span className="text-[10px] sm:text-[11px] font-mono font-extrabold text-slate-800 min-w-[20px] text-center">
          {item.delaySec !== undefined ? item.delaySec.toFixed(1) : "2.0"}s
        </span>
        <button
          type="button"
          onClick={() => handleRowDelayChange(item.id, (item.delaySec !== undefined ? item.delaySec : 2.0) + 0.5)}
          className="w-5 h-5 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white hover:bg-slate-150 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer active:scale-90"
        >
          +
        </button>
      </div>

      {/* Individual speed controller */}
      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5 sm:p-1" title="Tốc độ đọc của riêng câu này (0.3x đến 2.0x)">
        <span className="text-[10px] text-slate-400 font-bold mr-0.5 pl-0.5">Tốc:</span>
        <button
          type="button"
          onClick={() => handleRowSpeedChange(item.id, (item.speed !== undefined ? item.speed : speed) - 0.1)}
          className="w-5 h-5 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white hover:bg-slate-150 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer active:scale-90"
        >
          -
        </button>
        <span className="text-[10px] sm:text-[11px] font-mono font-extrabold text-slate-800 min-w-[24px] text-center">
          {(item.speed !== undefined ? item.speed : speed).toFixed(1)}x
        </span>
        <button
          type="button"
          onClick={() => handleRowSpeedChange(item.id, (item.speed !== undefined ? item.speed : speed) + 0.1)}
          className="w-5 h-5 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white hover:bg-slate-150 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer active:scale-90"
        >
          +
        </button>
      </div>

      {/* Dropdown for manually overrides translation / audio engine target */}
      <select
        id={`select-row-engine-${item.id}`}
        className={`text-[10px] font-semibold border rounded-lg p-1 sm:p-1.5 focus:outline-hidden transition-all shrink-0 cursor-pointer ${
          item.resolvedLang === 'vi' 
            ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/50' 
            : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-150/50'
        }`}
        value={item.selectedLang}
        onChange={(e) => handleRowLangChange(item.id, e.target.value as LanguageCode | 'auto')}
      >
        <option value="auto">
          🔮 {item.detectedLang === 'vi' ? '🇻🇳 Auto' : '🇺🇸 Auto'}
        </option>
        <option value="en">🇺🇸 EN-Voice</option>
        <option value="vi">🇻🇳 VI-Voice</option>
      </select>
    </div>
  );

  if (rowLayoutMode === 'below') {
    // Spacious layout option (Buttons below text sentence, full line space on top)
    return (
      <>
        {isSetStart && (
          <div className="bg-indigo-50/65 border border-indigo-200 border-b-0 rounded-t-xl px-4 py-2 flex items-center justify-between mt-3 shadow-3xs relative select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                🔗 Set song ngữ song hành
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDuplicateSet(item.setId!)}
                type="button"
                className="text-[10px] font-extrabold text-indigo-750 bg-white hover:bg-indigo-100 border border-indigo-250/70 rounded-md px-2 py-0.7 flex items-center gap-1 transition shadow-3xs cursor-pointer active:scale-95"
                title="Nhân bản nguyên Set này xuống dưới để nghe song ngữ 2 lần"
              >
                <Copy className="w-3 h-3 text-indigo-500" /> Nhân đôi Set
              </button>
              <button
                onClick={() => handleUngroupSet(item.setId!)}
                type="button"
                className="text-[10px] font-extrabold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-0.7 flex items-center gap-1 transition shadow-3xs cursor-pointer active:scale-95"
                title="Rã Set này thành các câu đơn độc lập"
              >
                <Unlink className="w-3 h-3 text-slate-400" /> Rã Set
              </button>
            </div>
          </div>
        )}
        <div
          id={`draggable-row-${item.id}`}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={(e) => handleDragEnd(e)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDropRow(e, index)}
          className={`group/row border p-3 flex flex-col gap-2.5 text-left transition-all relative ${customRoundedStyle} ${customBorderStyle}`}
        >
          {/* Horizontal text layer with delete option */}
          <div className="flex items-center justify-between gap-4 min-w-0">
            {renderLeftElements()}

            <div className="flex items-center gap-1 shrink-0">
              {!item.setId && index < speechList.length - 1 && (
                <button
                  onClick={() => handleJoinWithNext(index)}
                  type="button"
                  className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center w-7 h-7"
                  title="Gộp câu này & câu tiếp theo thành Set Song Ngữ"
                >
                  <Link className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id={`delete-row-btn-${item.id}`}
                onClick={() => handleDeleteRow(item.id)}
                type="button"
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                title="Xoá dòng khỏi danh sách"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Separator */}
          <hr className="border-slate-100" />

          {/* Bottom configurations bar */}
          <div className="flex items-center">
            {renderConfigElements()}
          </div>
        </div>
      </>
    );
  } else {
    // Compact side-by-side layout option
    return (
      <>
        {isSetStart && (
          <div className="bg-indigo-50/65 border border-indigo-200 border-b-0 rounded-t-xl px-4 py-2 flex items-center justify-between mt-3 shadow-3xs relative select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                🔗 Set song ngữ song hành
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDuplicateSet(item.setId!)}
                type="button"
                className="text-[10px] font-extrabold text-indigo-750 bg-white hover:bg-indigo-100 border border-indigo-250/70 rounded-md px-2 py-0.7 flex items-center gap-1 transition shadow-3xs cursor-pointer active:scale-95"
                title="Nhân bản nguyên Set này xuống dưới để nghe song ngữ 2 lần"
              >
                <Copy className="w-3 h-3 text-indigo-500" /> Nhân đôi Set
              </button>
              <button
                onClick={() => handleUngroupSet(item.setId!)}
                type="button"
                className="text-[10px] font-extrabold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-0.7 flex items-center gap-1 transition shadow-3xs cursor-pointer active:scale-95"
                title="Rã Set này thành các câu đơn độc lập"
              >
                <Unlink className="w-3 h-3 text-slate-400" /> Rã Set
              </button>
            </div>
          </div>
        )}
        <div
          id={`draggable-row-${item.id}`}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={(e) => handleDragEnd(e)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDropRow(e, index)}
          className={`group/row border py-2 px-3 flex items-center justify-between gap-3 text-left transition-all relative ${customRoundedStyle} ${customBorderStyle}`}
        >
          {renderLeftElements()}

          <div className="flex items-center space-x-2 shrink-0">
            {renderConfigElements()}

            {!item.setId && index < speechList.length - 1 && (
              <button
                onClick={() => handleJoinWithNext(index)}
                type="button"
                className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center w-7 h-7"
                title="Gộp câu này & câu tiếp theo thành Set Song Ngữ"
              >
                <Link className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id={`delete-row-btn-${item.id}`}
              onClick={() => handleDeleteRow(item.id)}
              type="button"
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
              title="Xoá dòng khỏi danh sách"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </>
    );
  }
};
