import React from "react";
import { CheckCircle2, AlertCircle, X, RotateCcw, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LoadedDetails } from "./useSharedPlaylistLoader";

interface SharedPlaylistBannerProps {
  message: string | null;
  type: "success" | "error" | null;
  loadedDetails: LoadedDetails | null;
  onClose: () => void;
  onRetry: () => void;
  onCreateNew: () => void;
}

export default function SharedPlaylistBanner({
  message,
  type,
  loadedDetails,
  onClose,
  onRetry,
  onCreateNew,
}: SharedPlaylistBannerProps) {
  if (!message || !type) return null;

  return (
    <AnimatePresence>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="pointer-events-auto w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 flex flex-col gap-3 overflow-hidden relative"
          id="shared-playlist-banner"
        >
          {/* Top colored accent line */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />

          <div className="flex items-start gap-3.5">
            <div className="shrink-0 mt-0.5">
              {type === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                {type === "success" ? "Đã tải bài học được chia sẻ" : "Không tải được bài học"}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {message}
              </p>

              {/* Show metadata on success */}
              {type === "success" && loadedDetails && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1 text-[11px] text-slate-600 font-semibold">
                  <div className="flex justify-between text-slate-700">
                    <span>Số câu thoại:</span>
                    <span className="font-extrabold text-indigo-600">{loadedDetails.numSentences} câu</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Tốc độ phát:</span>
                    <span className="font-extrabold text-indigo-600">{loadedDetails.speed}x</span>
                  </div>
                  {loadedDetails.numImages > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Hình ảnh gán kèm:</span>
                      <span className="font-extrabold text-indigo-600">{loadedDetails.numImages} ảnh</span>
                    </div>
                  )}
                  {loadedDetails.delay > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Thời gian nghỉ:</span>
                      <span className="font-extrabold text-indigo-600">{loadedDetails.delay} giây</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Close button for success */}
            {type === "success" && (
              <button
                onClick={onClose}
                className="shrink-0 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"
                aria-label="Đóng"
                id="close-success-banner-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action buttons for errors */}
          {type === "error" && (
            <div className="flex items-center justify-end gap-2 mt-2 border-t border-slate-100 pt-3">
              <button
                onClick={onCreateNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                id="create-new-lesson-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo bài mới</span>
              </button>
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm shadow-indigo-100"
                id="retry-load-share-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
              <button
                onClick={onClose}
                className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-500 rounded-lg text-xs font-semibold transition cursor-pointer"
                id="dismiss-error-banner-btn"
              >
                Bỏ qua
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
