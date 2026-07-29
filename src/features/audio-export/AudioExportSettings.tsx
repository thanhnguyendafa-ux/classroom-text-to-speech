import React from 'react';
import { AlertTriangle, CheckCircle2, Compass, Download, HelpCircle, Info, ListMusic, Mic } from 'lucide-react';
import type { SpeechItem } from '../../types';

interface AudioExportSettingsProps {
  selectedRange: string;
  onSelectedRangeChange: (value: string) => void;
  availableSets: string[];
  speechList: SpeechItem[];
  exportEngine: 'browser' | 'premium';
  onExportEngineChange: (value: 'browser' | 'premium') => void;
  audioSource: 'system' | 'mic';
  onAudioSourceChange: (value: 'system' | 'mic') => void;
  onlyCurrentTab: boolean;
  onOnlyCurrentTabChange: (value: boolean) => void;
  itemCount: number;
  onStart: () => void;
}

export function AudioExportSettings(props: AudioExportSettingsProps) {
  const { selectedRange, availableSets, speechList, exportEngine, audioSource, onlyCurrentTab } = props;
  const setSelectedRange = props.onSelectedRangeChange;
  const setExportEngine = props.onExportEngineChange;
  const setAudioSource = props.onAudioSourceChange;
  const setOnlyCurrentTab = props.onOnlyCurrentTabChange;
  const handleStartExport = props.onStart;
  const itemsToExport = { length: props.itemCount };
  return (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3.5">
                {/* 1. Range Scope Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ListMusic className="w-4 h-4 text-indigo-500" />
                    Phạm vi xuất âm thanh:
                  </label>
                  <select 
                    value={selectedRange}
                    onChange={(e) => setSelectedRange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg text-xs py-2 px-3 font-medium outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
                  >
                    <option value="all">Toàn bộ danh sách ({speechList.length} câu)</option>
                    {availableSets.map((setId) => {
                      const count = speechList.filter(item => item.setId === setId).length;
                      return (
                        <option key={setId} value={setId}>
                          Chỉ Set: {setId} (Gồm {count} câu)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Audio Engine Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    Chế độ Động cơ Giọng đọc:
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Browser Engine Selection */}
                    <div 
                      onClick={() => setExportEngine('browser')}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative ${
                        exportEngine === 'browser' 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Giọng Browser TTS</div>
                      <div className="text-[10px] text-slate-400 mt-1">Ghi âm thực bản địa tự động, không tốn tài nguyên.</div>
                      {exportEngine === 'browser' && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>

                    {/* Premium AI Engine Selection */}
                    <div 
                      onClick={() => setExportEngine('premium')}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative ${
                        exportEngine === 'premium' 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Premium AI (Gemini)</div>
                      <div className="text-[10px] text-slate-400 mt-1">Xuất siêu tốc, kỹ thuật số 100% tinh khiết, cực hay.</div>
                      {exportEngine === 'premium' && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Browser Recording Config Source Selection */}
                {exportEngine === 'browser' && (
                  <div className="mt-2.5 bg-slate-100 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs animate-fade-in">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-600" />
                      Nguồn âm thanh thu âm:
                    </span>
                    
                    <div className="space-y-2.5">
                      {/* Option 1: System Audio Only */}
                      <div 
                        onClick={() => setAudioSource('system')}
                        className={`p-3 rounded-xl border transition cursor-pointer select-none relative flex gap-2.5 items-start ${
                          audioSource === 'system' 
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-3xs' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="audioSource" 
                          checked={audioSource === 'system'} 
                          onChange={() => setAudioSource('system')} 
                          className="mt-0.5 w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="text-left font-medium">
                          <div className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1">
                            <span>Ghi âm Hệ thống (System Audio Only)</span>
                            <span className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded text-[9px]">KhuyĂªn dĂ¹ng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Ghi âm kỹ thuật số trực tiếp phát từ trình duyệt. Hoàn toàn tinh khiết, 100% không lẫn tạp âm môi trường và không rè/vọng.</div>
                        </div>
                      </div>

                      {/* Option 2: Mic fallback */}
                      <div 
                        onClick={() => setAudioSource('mic')}
                        className={`p-3 rounded-xl border transition cursor-pointer select-none relative flex gap-2.5 items-start ${
                          audioSource === 'mic' 
                            ? 'border-amber-600 bg-amber-50/20 text-amber-950 shadow-3xs' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="audioSource" 
                          checked={audioSource === 'mic'} 
                          onChange={() => setAudioSource('mic')} 
                          className="mt-0.5 w-3.5 h-3.5 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="text-left font-medium">
                          <div className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1">
                            <span>Microphone (Dự phòng cho máy ko hỗ trợ)</span>
                            <span className="text-amber-700 font-extrabold bg-amber-50 border border-amber-100 px-1 py-0.2 rounded text-[9px]">Dự phòng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Sử dụng mic của thiết bị để thu lại tiếng loa. Tự động bật Khử tiếng vang (Echo Cancel) và Lọc nhiễu.</div>
                        </div>
                      </div>
                    </div>

                    {/* Warning if Mic source is selected */}
                    {audioSource === 'mic' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 text-[#7c2d12] rounded-lg text-[10px] leading-relaxed flex gap-1.5 items-start font-medium animate-fade-in">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Chất lượng âm thanh phụ thuộc vào loa ngoài và Micro của máy bạn, dễ lẫn tiếng ồn môi trường xung quanh.</span>
                      </div>
                    )}

                    <hr className="border-slate-200" />

                    {/* Checkbox for onlyCurrentTab */}
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none font-semibold">
                      <input 
                        type="checkbox" 
                        checked={onlyCurrentTab}
                        onChange={(e) => setOnlyCurrentTab(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Chỉ hiển thị chia sẻ Thẻ trình duyệt hiện tại</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Instructions and help banners */}
              {exportEngine === 'browser' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex gap-2.5">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                      <strong className="text-amber-900 block mb-1 text-xs">⚠️ GIỚI HẠN BẢO MẬT & ROUTING ÂM THANH TRÊN CHROME:</strong>
                      Mặc dù bạn đã bấm chọn "Chia sẻ âm thanh thẻ" (Share tab audio), Google Chrome gộc tiếng nói mặc định <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950 text-[10px]">speechSynthesis</code> thẳng ra loa vật lý và <strong className="text-rose-700">bỏ qua dòng âm thanh thu âm nội bộ của Thẻ (Tab)</strong>. Do đó khi chỉ chia sẻ "Thẻ", video/audio sẽ luôn bị IM LẶNG.
                    </div>
                  </div>
                  
                  <div className="bg-white border border-amber-150 p-3 rounded-lg text-[11px] text-slate-700 space-y-2.5 shadow-3xs">
                    <div>
                      <span className="font-extrabold text-emerald-700 block">🌿 Giải pháp 1 (Khuyên dùng - Thành công 100%): Chọn "Premium AI (Gemini)"</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Chuyển động cơ phía trên sang <strong>"Premium AI (Gemini)"</strong>. Ở chế độ này, âm thanh được số hóa trực tiếp từ máy chủ Google, <strong>tải xuống ngay lập tức trong 3 giây</strong> tinh khiết 100% không lẫn tạp âm, không cần ngồi đợi chạy từng câu phát ra loa ngoài.
                        <span className="text-indigo-600 block mt-1 font-semibold">💡 Cách làm: Chỉ cần nhập mã Gemini API Key ở cột "Cấu hình" màu xám bên trái màn hình chính.</span>
                      </p>
                    </div>
                    
                    <hr className="border-slate-100" />
                    
                    <div>
                      <span className="font-extrabold text-amber-950 block">🖥️ Giải pháp 2 (Để xuất bằng Giọng Trình Duyệt): Chia sẻ Toàn Màn Hình hoặc dùng Microphone</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Nếu vẫn muốn dùng giọng đọc máy tính tự do, nhờ tuỳ chọn <strong>"Thu cả Mic/Loa ngoài"</strong> đã kích hoạt phía trên (Cơ chế giống quay Video):
                      </p>
                      <ol className="list-decimal pl-4.5 mt-1 space-y-1 text-slate-600 text-[10.5px]">
                        <li>Khi hộp thoại chia sẻ hiện lên, hãy nhớ tích chọn mục <strong className="text-slate-900">"Đồng thời chia sẻ âm thanh thẻ" (Also share tab audio)</strong> ở góc dưới (nếu chọn chia sẻ Thẻ/Tab).</li>
                        <li>Hoặc chọn <strong className="text-slate-900 font-extrabold">"Toàn bộ màn hình" (Entire Screen)</strong> và tích chọn <strong className="text-slate-900 font-extrabold">"Chia sẻ âm thanh hệ thống"</strong> ở góc dưới cùng bên trái.</li>
                        <li>Do mic laptop sẽ thu lại tiếng phát ra từ loa Asus, bạn hãy <strong>bật loa laptop Asus lớn lên một chút</strong> để Microphone ghi nhận rõ nét nhé!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-indigo-850 leading-relaxed font-medium">
                    <strong className="text-indigo-900 font-extrabold">Xuất Bản Âm Thanh Kỹ Thuật Số (Premium AI):</strong> Hệ thống tải các phân đoạn âm thanh chất lượng cao trực tiếp và ghép nối tự động. Tốc độ xuất nhanh đột phá, chuẩn xác 100%, không phụ thuộc vào loa hay mic máy tính của bạn.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleStartExport}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-bold hover:bg-indigo-700 transition active:scale-98 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Bắt đầu Xuất Âm Thanh ({itemsToExport.length} câu)</span>
              </button>
            </div>

  );
}
