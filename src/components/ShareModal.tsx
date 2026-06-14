import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Loader2, AlertCircle, Link } from 'lucide-react';
import { SpeechItem } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechList: SpeechItem[];
  speed: number;
  volume: number;
  autoAdvance: boolean;
  timeBetweenLines: number;
  playlistLoopMode: 'once' | 'infinite';
  engineMode: 'browser' | 'premium';
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
  engineMode
}: ShareModalProps) {
  const [shareId, setShareId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && speechList.length > 0) {
      setShareId(null);
      setError(null);
      setCopied(false);
      handleGenerateShareLink();
    }
  }, [isOpen, speechList]);

  const handleGenerateShareLink = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/share-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speechList,
          speed,
          volume,
          autoAdvance,
          timeBetweenLines,
          playlistLoopMode,
          engineMode
        })
      });

      if (!response.ok) {
        throw new Error('Máy chủ phản hồi lỗi khi tạo mã chia sẻ.');
      }

      const data = await response.json();
      if (data.id) {
        setShareId(data.id);
      } else {
        throw new Error('Định dạng phản hồi không hợp lệ.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tạo liên kết chia sẻ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = shareId ? `${originUrl}/?share=${shareId}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Chia sẻ chuỗi luyện tập</h3>
              <p className="text-[11px] text-slate-500 font-medium">Bất cứ ai có liên kết này đều có thể nghe & ôn tập</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-105 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-600 mt-4">Đang đóng gói dữ liệu & tạo liên kết...</p>
              <p className="text-xs text-slate-400 mt-1">Lưu trữ ảnh đã chọn, nghỉ chân, lặp...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-extrabold text-rose-800">{error}</p>
              <button
                onClick={handleGenerateShareLink}
                className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Liên kết công khai đã được tạo thành công! Tất cả thiết lập chi tiết bao gồm: <strong>thời gian chờ (delay)</strong>, <strong>giọng đọc chọn sẵn</strong>, <strong>số lần lặp lại</strong> và <strong>hình ảnh minh họa gán kèm</strong> của bạn đã được đóng gói nguyên vẹn.
              </p>

              {/* Link generator box */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Đường dẫn chia sẻ của bạn</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3 gap-2">
                  <Link className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={handleCopyLink}
                    className="bg-transparent text-slate-700 text-xs font-medium w-full outline-hidden cursor-pointer select-all truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`shrink-0 py-1.5 px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xs'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép!</span>
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

              {/* Information stats block */}
              <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-3.5 text-xs text-indigo-950 flex flex-col gap-1">
                <div className="flex justify-between font-bold text-indigo-900 border-b border-indigo-100/50 pb-1.5 mb-1.5">
                  <span>Thông số đóng gói:</span>
                  <span>{speechList.length} câu thoại</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[11px] text-slate-600 font-medium">
                  <div>• Vận tốc chuẩn: <span className="font-bold text-indigo-700">{speed}x</span></div>
                  <div>• Lặp hàng câu: <span className="font-bold text-indigo-700">{playlistLoopMode === 'infinite' ? 'Vô hạn' : 'Một lần'}</span></div>
                  <div>• Có ảnh gán: <span className="font-bold text-indigo-700">{speechList.filter(i => i.imageUrl).length} ảnh</span></div>
                  <div>• Chờ giữa dòng: <span className="font-bold text-indigo-700">{timeBetweenLines} Giây</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition px-4 py-2 rounded-xl cursor-pointer"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}
