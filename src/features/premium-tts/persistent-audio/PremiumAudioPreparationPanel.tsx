import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  Square, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  RefreshCw, 
  Music,
  Info
} from 'lucide-react';
import { PreparationProgress } from './premiumAudioTypes';

interface PremiumAudioPreparationPanelProps {
  userId: string | null;
  lessonId: string | null;
  userGeminiApiKey: string;
  isPreparing: boolean;
  isLoadingManifest: boolean;
  progress: PreparationProgress;
  error: string | null;
  startPreparation: () => Promise<void>;
  stopPreparation: () => void;
  deletePreparedAudio: () => Promise<void>;
  cleanUnusedAudio: () => Promise<void>;
}

export default function PremiumAudioPreparationPanel({
  userId,
  lessonId,
  userGeminiApiKey,
  isPreparing,
  isLoadingManifest,
  progress,
  error,
  startPreparation,
  stopPreparation,
  deletePreparedAudio,
  cleanUnusedAudio
}: PremiumAudioPreparationPanelProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isCloudSaved = !!(userId && lessonId);
  const isApiKeyMissing = !userGeminiApiKey || !userGeminiApiKey.trim();

  // Calculate percentage
  const readyPercent = progress.total > 0 
    ? Math.round((progress.ready / progress.total) * 100) 
    : 0;

  const handleStart = async () => {
    if (!isCloudSaved || isApiKeyMissing) return;
    await startPreparation();
  };

  const handleDelete = async () => {
    await deletePreparedAudio();
    setShowConfirmDelete(false);
  };

  return (
    <div 
      id="premium-audio-preparation-panel" 
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs text-left space-y-4 font-sans"
    >
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          Tải Sẵn Giọng Premium Offline
        </h3>
        {isLoadingManifest && (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Validation Messages */}
      {!isCloudSaved && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Yêu cầu lưu bài giảng:</span> Vui lòng bấm <span className="font-semibold text-slate-900">Lưu thay đổi đám mây</span> phía trên trước để kích hoạt tính năng tải sẵn audio.
          </div>
        </div>
      )}

      {isCloudSaved && isApiKeyMissing && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Thiếu API Key:</span> Bạn cần điền <span className="font-semibold text-slate-900">Gemini API Key</span> ở bảng cấu hình phía trên trước khi tạo sẵn audio.
          </div>
        </div>
      )}

      {/* Stats Board */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">Audio chuẩn bị</div>
          <div className="text-sm font-black text-slate-700 mt-0.5">
            {progress.ready} / {progress.total}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">đoạn ready</div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-center">
          <div className="text-[10px] uppercase font-bold text-emerald-600">Tiết kiệm Quota</div>
          <div className="text-sm font-black text-emerald-700 mt-0.5">
            {progress.quotaSaved} calls
          </div>
          <div className="text-[9px] text-emerald-600/80 mt-0.5">
            trùng: {progress.duplicateReused} | sẵn: {progress.ready}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Tiến độ tải sẵn:</span>
            <span className="text-indigo-600">{readyPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${readyPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Detail Counters */}
      <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
        <div className="flex justify-between">
          <span>Còn thiếu / Chưa tạo:</span>
          <span className="font-bold text-slate-700">{progress.total - progress.ready - progress.failed}</span>
        </div>
        <div className="flex justify-between">
          <span>Bị lỗi (Quá tải/Lỗi mạng):</span>
          <span className={`font-bold ${progress.failed > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{progress.failed}</span>
        </div>
        {progress.duplicateReused > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Dòng trùng / Set multiplier:</span>
            <span className="font-bold">x{progress.duplicateReused} đoạn</span>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 leading-normal font-medium">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-1.5 flex flex-wrap gap-2.5">
        {isPreparing ? (
          <button
            type="button"
            onClick={stopPreparation}
            className="flex-1 min-w-[120px] py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition select-none cursor-pointer active:scale-98"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Dừng tải sẵn</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={!isCloudSaved || isApiKeyMissing}
            className="flex-1 min-w-[150px] py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition select-none cursor-pointer active:scale-98"
          >
            {isPreparing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>
              {progress.ready > 0 && progress.ready < progress.total ? 'Tạo tiếp giọng Premium' : 'Tạo sẵn giọng Premium'}
            </span>
          </button>
        )}

        {progress.ready > 0 && !isPreparing && (
          <>
            <button
              type="button"
              onClick={() => cleanUnusedAudio()}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition"
              title="Dọn audio không còn dùng"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {showConfirmDelete ? (
              <div className="w-full flex items-center gap-2 mt-2 animate-fade-in">
                <span className="text-[10px] text-rose-600 font-bold flex-1">Xác nhận xóa hết audio?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="py-1 px-2.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center transition cursor-pointer"
                title="Xóa audio đã tạo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Info Tip */}
      <div className="text-[10px] text-slate-400 font-medium flex gap-1.5 items-start">
        <Info className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
        <p className="leading-snug">
          Khi phát trình chiếu, app sẽ lấy trực tiếp audio đã chuẩn bị từ cloud về phát, giúp bảo vệ quota Gemini API của bạn hoàn toàn!
        </p>
      </div>
    </div>
  );
}
