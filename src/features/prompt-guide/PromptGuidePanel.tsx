import { useState } from 'react';
import { Check, Copy, HelpCircle, Sparkles } from 'lucide-react';
import { buildPromptGuide, type PromptType } from './promptGuide';

export default function PromptGuidePanel() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [promptTopic, setPromptTopic] = useState('Giao thông công cộng');
  const [promptMainIdeas, setPromptMainIdeas] = useState('Khuyến khích công dân sử dụng phương tiện xanh, điện sạch, metro, xe buýt để giảm thiểu nạn kẹt xe ùn tắc và ngăn chặn ô nhiễm môi trường.');
  const [promptType, setPromptType] = useState<PromptType>('pause');
  const [showGptPromptGuide, setShowGptPromptGuide] = useState(false);
  const generatedPrompt = buildPromptGuide({ promptTopic, promptMainIdeas, promptType });
  const handleCopyGPTPrompt = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(generatedPrompt).then(() => { setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2055); }).catch((error) => console.error('Failed to copy GPT Prompt:', error));
  };
  return (
    <div id="gpt-prompt-helper-box" className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-pink-50/70 border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 justify-start">
            <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
            Mẫu Prompt AI Tạo Giáo Án
          </h3>
          <p className="text-[11px] text-slate-505 mt-0.5">
            Dán câu lệnh vào ChatGPT / Claude / Gemini để nhận danh sách từ và câu song ngữ nhanh chóng.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyGPTPrompt}
          className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 justify-center cursor-pointer select-none shrink-0 self-start sm:self-center ${
            copiedPrompt
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs scale-102'
              : 'bg-indigo-650 hover:bg-indigo-700 text-white border-transparent'
          }`}
        >
          {copiedPrompt ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Đã copy!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Sao chép Prompt
            </>
          )}
        </button>
      </div>

      {/* Guide/Explanation of special symbols - COLLAPSED / TOGGLED */}
      <div className="space-y-2 mb-4">
        <button
          type="button"
          onClick={() => setShowGptPromptGuide(!showGptPromptGuide)}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 select-none cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showGptPromptGuide ? "Ẩn hướng dẫn ký hiệu / ;" : "Trợ giúp: Hướng dẫn ký hiệu đặc biệt / ;"}</span>
        </button>
        {showGptPromptGuide && (
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-[11px] text-slate-605 space-y-1.5 leading-relaxed animate-fade-in text-left">
            <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
              <li>
                <strong className="text-pink-600 font-mono">Dấu gạch chéo (/Y)</strong>: Quy định <strong className="text-slate-800">thời gian nghỉ (giây)</strong> sau dòng đó. <br />
                <span className="text-slate-500">Ví dụ: <code className="bg-slate-100 px-1 rounded text-[10px]">Xin chào /2</code> (Đọc xong "Xin chào" sẽ dừng nghỉ 2 giây rồi đọc tiếp).</span>
              </li>
              <li>
                <strong className="text-indigo-600 font-mono">Dấu chấm phẩy (;X)</strong>: Quy định <strong className="text-slate-800">số lần đọc lặp lại</strong> dòng đó. <br />
                <span className="text-slate-500">Ví dụ: <code className="bg-slate-100 px-1 rounded text-[10px]">Apple ;3</code> (Nói từ "Apple" lặp 3 lần liên tiếp rồi học tiếp câu sau).</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Live configuration tools */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Topic Input */}
        <div className="space-y-1.5">
          <label htmlFor="prompt-topic-input" className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
            ✍️ 1. NHẬP CHỦ ĐỀ MUỐN HỌC:
          </label>
          <input
            id="prompt-topic-input"
            type="text"
            value={promptTopic}
            onChange={(e) => setPromptTopic(e.target.value)}
            placeholder="Ví dụ: Đàm thoại tại nhà hàng, Từ vựng sân bay..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition text-slate-800"
          />
        </div>

        {/* Main Ideas Input */}
        <div className="space-y-1.5">
          <label htmlFor="prompt-ideas-input" className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
            💡 2. Ý CHÍNH CẦN PHÁT TRIỂN:
          </label>
          <textarea
            id="prompt-ideas-input"
            value={promptMainIdeas}
            onChange={(e) => setPromptMainIdeas(e.target.value)}
            placeholder="Ví dụ: Khuyến khích người dân sử dụng phương tiện xanh, điện sạch, xe buýt để tránh kẹt xe và chống biến đổi khí hậu..."
            rows={2.5}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition resize-none text-slate-800 font-sans leading-relaxed"
          />
        </div>

        {/* Prompt Type Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
            ⚙️ 3. CHỌN CẤU TRÚC PHÂN CÁCH NGHỈ:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'basic', label: 'Không có gạch nghỉ /', desc: 'Mẫu cơ bản thô' },
              { id: 'repeat', label: 'Chỉ có dấu lặp ;', desc: 'Có tần suất lặp ;X' },
              { id: 'pause', label: 'Chỉ có khoảng nghỉ /', desc: 'Mẫu có giãn cách /Y' },
              { id: 'advanced', label: 'Mẫu gộp nâng cao ; /', desc: 'Gộp cả lặp ;X và nghỉ /Y' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPromptType(t.id as PromptType)}
                className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  promptType === t.id
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650'
                }`}
              >
                <div className="text-[10px]">{t.label}</div>
                <div className={`text-[8.5px] ${promptType === t.id ? 'text-indigo-500' : 'text-slate-400'} font-normal mt-0.5 line-clamp-1`}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main code box previewer */}
      <div className="relative">
        <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-md bg-slate-800 text-[8.5px] font-mono text-slate-350 uppercase tracking-wider pointer-events-none">
          XEM TRƯỚC PROMPT
        </div>
        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 group">
          <pre className="text-[10.5px] font-mono text-indigo-100 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed scrollbar-thin text-left select-all pr-2">
            {generatedPrompt}
          </pre>
          <div className="mt-2 pt-2 border-t border-slate-850 flex flex-col text-[9px] text-slate-400 gap-1.5">
            <span>* Giáo án được tạo xen kẽ song ngữ, tuần tự hợp lý.</span>
            <span className="font-mono text-indigo-350 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 shrink-0 select-none text-center">
              Bấm sao chép để dán vào AI
            </span>
          </div>
        </div>
      </div>
    </div>

  );
}
