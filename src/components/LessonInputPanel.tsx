import React from 'react';
import { FileText, Link, Volume2, RotateCcw } from 'lucide-react';

interface LessonInputPanelProps {
  rawText: string;
  setRawText: (val: string) => void;
  autoGroupSet: boolean;
  onAutoGroupSetChange: (checked: boolean) => void;
  setMultiplier: number;
  onSetMultiplierChange: (val: number) => void;
  onCreateList: () => void;
  onClearInput: () => void;
  onApplyTemplate: (content: string) => void;
}

// Pre-defined educational templates for teachers and students
export const TEMPLATES = [
  {
    title: 'Bilingual Popcorn',
    description: 'Bộ từ vựng & hội thoại song ngữ Anh - Việt mẫu đi từ Từ đơn -> Cụm từ -> Câu.',
    content: 'popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành\nI love eating delicious popcorn. /1.5\nMình rất thích ăn bắp rang ngon lành.\nsharing popcorn\nchia sẻ bắp rang\nWe are sharing popcorn while watching a movie. ;2\nChúng mình đang chung nhau ăn bắp rang khi xem phim.'
  },
  {
    title: 'Vietnamese Accent & Diacritics',
    description: 'Giúp kiểm tra phát âm Tiếng Việt chuẩn (dấu thanh sắc/huyền/hỏi/ngã/nặng mượt mà).',
    content: 'quả bưởi ngọt\nmẹ mua bánh giầy khúc\ncon hươu cao cổ đang gặm cỏ /3\ntiếng sấm sét vang rung trời chuyển đất'
  },
  {
    title: 'Song Lyrics Dictation',
    description: 'Luyện chép chính tả nhạc điệu song ngữ Anh - Việt với ký tự lặp ;X và dừng nghỉ /Y.',
    content: 'Yesterday, all my troubles seemed so far away ;2 /3.0\nNgày hôm qua, dường như mọi sầu lo đều biến tan đi mất.\nNow it looks as though they are here to stay.\nGiờ đây, chúng như đang hiển hiện ngay trước mắt.'
  }
];

export const LessonInputPanel: React.FC<LessonInputPanelProps> = ({
  rawText,
  setRawText,
  autoGroupSet,
  onAutoGroupSetChange,
  setMultiplier,
  onSetMultiplierChange,
  onCreateList,
  onClearInput,
  onApplyTemplate
}) => {
  const lineCount = rawText.split('\n').filter(l => l.trim().length > 0).length;

  return (
    <div id="words-maker-box" className="bg-white border border-slate-202 rounded-2xl p-5 shadow-xs hover:border-slate-350 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3 text-left">
        <label htmlFor="word-list-textarea" className="font-bold text-slate-900 text-base flex items-center gap-2 cursor-pointer select-none">
          <FileText className="w-5 h-5 text-indigo-600" />
          Nhập danh sách dòng từ
        </label>
        <div id="row-estimation" className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md select-none">
          {lineCount} dòng phát hiện
        </div>
      </div>

      <textarea
        id="word-list-textarea"
        rows={6}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Ví dụ:&#10;banana&#10;Good morning everyone&#10;bánh mì ngon thịt nguội&#10;how is the weather today?..."
        className="w-full text-xs font-sans bg-slate-55 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-505 focus:bg-white focus:border-indigo-500 transition-all text-left"
      />

      {/* Course Template selectors */}
      <div id="text-preset-box" className="mt-4 text-left">
        <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-tight">Bài giảng mẫu nhanh:</span>
        <div id="presets-links" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onApplyTemplate(tmpl.content)}
              className="text-left text-xs bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 rounded-lg p-2.5 transition active:scale-[0.98] cursor-pointer"
              title={tmpl.description}
            >
              <strong className="text-slate-800 block truncate">{tmpl.title}</strong>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">{tmpl.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auto Group toggle option */}
      <div id="auto-group-toggle-container" className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col pr-2 text-left">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-start">
              <Link className="w-3.5 h-3.5 text-indigo-500 rotate-45" />
              Tự động ghép 2 dòng thành 1 Set
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 max-w-xs text-left leading-relaxed">
              Hai dòng liên tiếp sẽ được gộp chung thành một cặp để thao tác & sao chép cùng lúc
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={autoGroupSet}
              onChange={(e) => onAutoGroupSetChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {autoGroupSet && (
          <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs animate-fadeIn text-left">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              ⚡ Số lần lặp/sao chép mỗi Set khi tạo:
            </span>
            <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-200/55 shrink-0 select-none">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSetMultiplierChange(num)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    setMultiplier === num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                  }`}
                >
                  x{num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Build interactive board keys */}
      <div id="creator-actions-row" className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
        <button
          id="create-list-trigger"
          type="button"
          onClick={onCreateList}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          Tạo danh mục loa đọc
        </button>
        <button
          id="clear-input-trigger"
          type="button"
          onClick={onClearInput}
          className="bg-slate-50 hover:bg-slate-200 text-slate-600 border border-slate-200 font-semibold text-xs px-3 rounded-xl transition flex-shrink-0 flex items-center justify-center cursor-pointer"
          title="Xoá trống vùng nhập"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
