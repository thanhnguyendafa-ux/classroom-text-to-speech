import React, { useState, useEffect } from "react";
import { X, Copy, Check, Share2, Loader2, AlertCircle, Link, FileText, ImageIcon, Zap, Hourglass } from "lucide-react";
import { SpeechItem } from "../types";
import { useSharePlaylistMutation } from "../features/shared-playlist/useSharePlaylistMutation";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechList: SpeechItem[];
  speed: number;
  volume: number;
  autoAdvance: boolean;
  timeBetweenLines: number;
  playlistLoopMode: "once" | "infinite";
  engineMode: "browser" | "premium";
}

export default function ShareModal({
  isOpen,
  onClose,
  speechList,
  speed,
  volume,
  autoAdvance,
  timeBetweenLines,
  playlistLoopMode,
  engineMode,
}: ShareModalProps) {
  const { isLoading, error, shareId, generateShareLink, resetMutation } = useSharePlaylistMutation();
  const [copied, setCopied] = useState<boolean>(false);

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      resetMutation();
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareId ? `${originUrl}/?share=${shareId}` : "";

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Copy failed:", err);
      });
  };

  const handleTriggerGenerate = () => {
    generateShareLink({
      speechList,
      speed,
      volume,
      autoAdvance,
      timeBetweenLines,
      playlistLoopMode,
      engineMode,
    });
  };

  const numImages = speechList.filter((item) => item.imageUrl).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in" id="share-modal-overlay">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col" id="share-modal-container">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Chia sẻ bài luyện tập</h3>
              <p className="text-[11px] text-slate-500 font-medium">Bất cứ ai có liên kết đều có thể mở bài</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"
            id="close-share-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10" id="share-loading-state">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-extrabold text-slate-700 mt-4">Đang tạo liên kết...</p>
              <p className="text-xs text-slate-400 mt-1">Đóng gói bài học và cấu hình an toàn...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-5 text-center" id="share-error-state">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-extrabold text-rose-800 leading-normal">{error}</p>
              <button
                onClick={handleTriggerGenerate}
                className="mt-4 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                id="retry-generate-btn"
              >
                Thử lại
              </button>
            </div>
          ) : !shareId ? (
            <div className="space-y-5" id="share-draft-state">
              <p className="text-xs text-slate-500 leading-relaxed">
                Đường dẫn chia sẻ sẽ lưu lại toàn bộ các câu luyện nói, hình ảnh gán kèm, thiết lập thời gian chờ (delay) và tốc độ đọc để người nhận học tập chuẩn xác nhất.
              </p>

              {/* Action Buttons to Create Link */}
              <button
                onClick={handleTriggerGenerate}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold shadow-md hover:shadow-indigo-100 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                id="generate-share-link-btn"
              >
                <Link className="w-4 h-4" />
                <span>Tạo liên kết chia sẻ</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5" id="share-success-state">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-xs leading-relaxed">
                🎉 <strong>Liên kết công khai đã tạo thành công!</strong> Học viên hoặc đồng nghiệp của bạn có thể mở ngay trên trình duyệt mà không cần cài đặt gì thêm.
              </div>

              {/* Link Input and Copy Button */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Liên kết chia sẻ</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3 gap-2">
                  <Link className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={handleCopyLink}
                    className="bg-transparent text-slate-700 text-xs font-bold w-full outline-hidden cursor-pointer select-all truncate"
                    id="share-link-input"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`shrink-0 py-2 px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                      copied 
                        ? "bg-emerald-600 text-white" 
                        : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xs"
                    }`}
                    id="copy-link-btn"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 animate-bounce" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Core Content Summary Box (Always display at the bottom) */}
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Tóm tắt nội dung bài học</h4>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Số câu: <strong className="text-slate-900">{speechList.length} câu</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Có ảnh: <strong className="text-slate-900">{numImages} ảnh</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Tốc độ phát: <strong className="text-slate-900">{speed}x</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Nghỉ giữa câu: <strong className="text-slate-900">{timeBetweenLines}s</strong></span>
              </div>
              <div className="col-span-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 flex justify-between">
                <span>Chế độ lặp: <strong>{playlistLoopMode === "infinite" ? "Lặp vô hạn" : "Phát một lần"}</strong></span>
                <span>Giọng đọc: <strong>{engineMode === "premium" ? "Premium AI" : "Trình duyệt"}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            {shareId && !isLoading && !error && (
              <button
                onClick={handleTriggerGenerate}
                className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition"
                id="regenerate-share-link-btn"
              >
                Tạo lại liên kết mới
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition px-4 py-2 rounded-xl cursor-pointer"
            id="close-share-modal-bottom-btn"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
