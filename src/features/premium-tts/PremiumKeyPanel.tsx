import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Trash2, Clipboard, ExternalLink, AlertCircle, Check } from 'lucide-react';

interface PremiumKeyPanelProps {
  apiKey: string;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export const PremiumKeyPanel: React.FC<PremiumKeyPanelProps> = ({
  apiKey,
  showApiKey,
  setShowApiKey,
  setApiKey,
  clearApiKey,
}) => {
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isStorageBlocked, setIsStorageBlocked] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('__test_premium_storage__', 'test');
      sessionStorage.removeItem('__test_premium_storage__');
    } catch {
      setIsStorageBlocked(true);
    }
  }, []);

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
        triggerCopySuccess();
      } else {
        fallbackPrompt();
      }
    } catch (err) {
      fallbackPrompt();
    }
  };

  const fallbackPrompt = () => {
    const userInput = window.prompt("Dán Gemini API Key của bạn vào đây:");
    if (userInput !== null) {
      setApiKey(userInput.trim());
      triggerCopySuccess();
    }
  };

  const triggerCopySuccess = () => {
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div id="premium-key-panel" className="bg-indigo-50/60 border border-indigo-150/85 rounded-xl p-3 mb-4 animate-fade-in">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor="user-api-key" className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
          <Key className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Key Gemini API Của Bạn
        </label>
        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[10px] font-extrabold text-indigo-600 hover:underline flex items-center gap-0.5 transition-colors"
        >
          Lấy Key Miễn Phí <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {isStorageBlocked && (
        <div id="session-storage-blocked-alert" className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/60 rounded-lg p-2 mb-2 text-rose-850 text-[10.5px] font-medium leading-tight">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Lưu ý: Bộ nhớ phiên bị chặn. API Key chỉ dùng được cho đến khi trang được đóng hoặc tải lại.</span>
        </div>
      )}

      {!apiKey ? (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 rounded-lg p-2 mb-2 text-amber-800 text-[11px] font-medium leading-tight">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Chưa nhập Gemini API key. Hãy nhấn nút dán hoặc nhập ở dưới.</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 rounded-lg p-2 mb-2 text-emerald-800 text-[11px] font-medium leading-tight">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Đã cấu hình Gemini API Key thành công!</span>
        </div>
      )}

      <div className="relative">
        <input
          id="user-api-key"
          type={showApiKey ? "text" : "password"}
          placeholder="Nhập API Key: AIzaSy..."
          className="w-full text-xs font-mono bg-white border border-indigo-200 rounded-lg pl-3 pr-8 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowApiKey(!showApiKey)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          title={showApiKey ? "Ẩn API Key" : "Hiển thị API Key"}
        >
          {showApiKey ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="flex justify-between items-center mt-2.5">
        <p className="text-[9px] text-slate-450 leading-relaxed max-w-[65%]">
          * Key chỉ lưu trong trình duyệt này. Không nên dùng trên máy công cộng.
        </p>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePasteKey}
            className={`text-[10px] font-extrabold flex items-center gap-0.5 cursor-pointer bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 px-2 py-0.5 rounded transition-all ${
              copiedSuccess ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-indigo-700'
            }`}
          >
            {copiedSuccess ? (
              <>
                <Check className="w-2.5 h-2.5" /> Đã dán
              </>
            ) : (
              <>
                <Clipboard className="w-2.5 h-2.5" /> Dán key
              </>
            )}
          </button>
          
          {apiKey && (
            <button
              type="button"
              onClick={clearApiKey}
              className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 cursor-pointer"
              title="Xóa Key hiện tại"
            >
              <Trash2 className="w-2.5 h-2.5" /> Xóa key
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
