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
                    Pháº¡m vi xuáº¥t Ă¢m thanh:
                  </label>
                  <select 
                    value={selectedRange}
                    onChange={(e) => setSelectedRange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg text-xs py-2 px-3 font-medium outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
                  >
                    <option value="all">ToĂ n bá»™ danh sĂ¡ch ({speechList.length} cĂ¢u)</option>
                    {availableSets.map((setId) => {
                      const count = speechList.filter(item => item.setId === setId).length;
                      return (
                        <option key={setId} value={setId}>
                          Chá»‰ Set: {setId} (Gá»“m {count} cĂ¢u)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Audio Engine Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    Cháº¿ Ä‘á»™ Äá»™ng cÆ¡ Giá»ng Ä‘á»c:
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
                      <div className="font-extrabold text-xs">Giá»ng Browser TTS</div>
                      <div className="text-[10px] text-slate-400 mt-1">Ghi Ă¢m thá»±c báº£n Ä‘á»‹a tá»± Ä‘á»™ng, khĂ´ng tá»‘n tĂ i nguyĂªn.</div>
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
                      <div className="text-[10px] text-slate-400 mt-1">Xuáº¥t siĂªu tá»‘c, ká»¹ thuáº­t sá»‘ 100% tinh khiáº¿t, cá»±c hay.</div>
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
                      Nguá»“n Ă¢m thanh thu Ă¢m:
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
                            <span>Ghi Ă¢m Há»‡ thá»‘ng (System Audio Only)</span>
                            <span className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded text-[9px]">KhuyĂªn dĂ¹ng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Ghi Ă¢m ká»¹ thuáº­t sá»‘ trá»±c tiáº¿p phĂ¡t tá»« trĂ¬nh duyá»‡t. HoĂ n toĂ n tinh khiáº¿t, 100% khĂ´ng láº«n táº¡p Ă¢m mĂ´i trÆ°á»ng vĂ  khĂ´ng rĂ¨/vá»ng.</div>
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
                            <span>Microphone (Dá»± phĂ²ng cho mĂ¡y ko há»— trá»£)</span>
                            <span className="text-amber-700 font-extrabold bg-amber-50 border border-amber-100 px-1 py-0.2 rounded text-[9px]">Dá»± phĂ²ng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Sá»­ dá»¥ng mic cá»§a thiáº¿t bá»‹ Ä‘á»ƒ thu láº¡i tiáº¿ng loa. Tá»± Ä‘á»™ng báº­t Khá»­ tiáº¿ng vang (Echo Cancel) vĂ  Lá»c nhiá»…u.</div>
                        </div>
                      </div>
                    </div>

                    {/* Warning if Mic source is selected */}
                    {audioSource === 'mic' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 text-[#7c2d12] rounded-lg text-[10px] leading-relaxed flex gap-1.5 items-start font-medium animate-fade-in">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Cháº¥t lÆ°á»£ng Ă¢m thanh phá»¥ thuá»™c vĂ o loa ngoĂ i vĂ  Micro cá»§a mĂ¡y báº¡n, dá»… láº«n tiáº¿ng á»“n mĂ´i trÆ°á»ng xung quanh.</span>
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
                      <span>Chá»‰ hiá»ƒn thá»‹ chia sáº» Tháº» trĂ¬nh duyá»‡t hiá»‡n táº¡i</span>
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
                      <strong className="text-amber-900 block mb-1 text-xs">â ï¸ GIá»I Háº N Báº¢O Máº¬T & ROUTING Ă‚M THANH TRĂN CHROME:</strong>
                      Máº·c dĂ¹ báº¡n Ä‘Ă£ báº¥m chá»n "Chia sáº» Ă¢m thanh tháº»" (Share tab audio), Google Chrome gá»™c tiáº¿ng nĂ³i máº·c Ä‘á»‹nh <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950 text-[10px]">speechSynthesis</code> tháº³ng ra loa váº­t lĂ½ vĂ  <strong className="text-rose-700">bá» qua dĂ²ng Ă¢m thanh thu Ă¢m ná»™i bá»™ cá»§a Tháº» (Tab)</strong>. Do Ä‘Ă³ khi chá»‰ chia sáº» "Tháº»", video/audio sáº½ luĂ´n bá»‹ IM Láº¶NG.
                    </div>
                  </div>
                  
                  <div className="bg-white border border-amber-150 p-3 rounded-lg text-[11px] text-slate-700 space-y-2.5 shadow-3xs">
                    <div>
                      <span className="font-extrabold text-emerald-700 block">đŸŒ¿ Giáº£i phĂ¡p 1 (KhuyĂªn dĂ¹ng - ThĂ nh cĂ´ng 100%): Chá»n "Premium AI (Gemini)"</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Chuyá»ƒn Ä‘á»™ng cÆ¡ phĂ­a trĂªn sang <strong>"Premium AI (Gemini)"</strong>. á» cháº¿ Ä‘á»™ nĂ y, Ă¢m thanh Ä‘Æ°á»£c sá»‘ hĂ³a trá»±c tiáº¿p tá»« mĂ¡y chá»§ Google, <strong>táº£i xuá»‘ng ngay láº­p tá»©c trong 3 giĂ¢y</strong> tinh khiáº¿t 100% khĂ´ng láº«n táº¡p Ă¢m, khĂ´ng cáº§n ngá»“i Ä‘á»£i cháº¡y tá»«ng cĂ¢u phĂ¡t ra loa ngoĂ i.
                        <span className="text-indigo-600 block mt-1 font-semibold">đŸ’¡ CĂ¡ch lĂ m: Chá»‰ cáº§n nháº­p mĂ£ Gemini API Key á»Ÿ cá»™t "Cáº¥u hĂ¬nh" mĂ u xĂ¡m bĂªn trĂ¡i mĂ n hĂ¬nh chĂ­nh.</span>
                      </p>
                    </div>
                    
                    <hr className="border-slate-100" />
                    
                    <div>
                      <span className="font-extrabold text-amber-950 block">đŸ–¥ï¸ Giáº£i phĂ¡p 2 (Äá»ƒ xuáº¥t báº±ng Giá»ng TrĂ¬nh Duyá»‡t): Chia sáº» ToĂ n MĂ n HĂ¬nh hoáº·c dĂ¹ng Microphone</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Náº¿u váº«n muá»‘n dĂ¹ng giá»ng Ä‘á»c mĂ¡y tĂ­nh tá»± do, nhá» tuá»³ chá»n <strong>"Thu cáº£ Mic/Loa ngoĂ i"</strong> Ä‘Ă£ kĂ­ch hoáº¡t phĂ­a trĂªn (CÆ¡ cháº¿ giá»‘ng quay Video):
                      </p>
                      <ol className="list-decimal pl-4.5 mt-1 space-y-1 text-slate-600 text-[10.5px]">
                        <li>Khi há»™p thoáº¡i chia sáº» hiá»‡n lĂªn, hĂ£y nhá»› tĂ­ch chá»n má»¥c <strong className="text-slate-900">"Äá»“ng thá»i chia sáº» Ă¢m thanh tháº»" (Also share tab audio)</strong> á»Ÿ gĂ³c dÆ°á»›i (náº¿u chá»n chia sáº» Tháº»/Tab).</li>
                        <li>Hoáº·c chá»n <strong className="text-slate-900 font-extrabold">"ToĂ n bá»™ mĂ n hĂ¬nh" (Entire Screen)</strong> vĂ  tĂ­ch chá»n <strong className="text-slate-900 font-extrabold">"Chia sáº» Ă¢m thanh há»‡ thá»‘ng"</strong> á»Ÿ gĂ³c dÆ°á»›i cĂ¹ng bĂªn trĂ¡i.</li>
                        <li>Do mic laptop sáº½ thu láº¡i tiáº¿ng phĂ¡t ra tá»« loa Asus, báº¡n hĂ£y <strong>báº­t loa laptop Asus lá»›n lĂªn má»™t chĂºt</strong> Ä‘á»ƒ Microphone ghi nháº­n rĂµ nĂ©t nhĂ©!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-indigo-850 leading-relaxed font-medium">
                    <strong className="text-indigo-900 font-extrabold">Xuáº¥t Báº£n Ă‚m Thanh Ká»¹ Thuáº­t Sá»‘ (Premium AI):</strong> Há»‡ thá»‘ng táº£i cĂ¡c phĂ¢n Ä‘oáº¡n Ă¢m thanh cháº¥t lÆ°á»£ng cao trá»±c tiáº¿p vĂ  ghĂ©p ná»‘i tá»± Ä‘á»™ng. Tá»‘c Ä‘á»™ xuáº¥t nhanh Ä‘á»™t phĂ¡, chuáº©n xĂ¡c 100%, khĂ´ng phá»¥ thuá»™c vĂ o loa hay mic mĂ¡y tĂ­nh cá»§a báº¡n.
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
                <span>Báº¯t Ä‘áº§u Xuáº¥t Ă‚m Thanh ({itemsToExport.length} cĂ¢u)</span>
              </button>
            </div>

  );
}
