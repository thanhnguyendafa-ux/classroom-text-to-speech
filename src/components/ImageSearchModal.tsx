import React, { useState, useEffect } from 'react';
import { Search, Globe, X, Check, Image as ImageIcon, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { SpeechItem } from '../types';
import { authenticatedFetch } from '../lib/firebase/authenticatedFetch';

interface SearchResult {
  id: string;
  url: string;
  thumb: string;
  author: string;
  authorUrl: string;
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SpeechItem | null;
  onAssignImage: (imageUrl: string) => void;
}

export default function ImageSearchModal({ isOpen, onClose, item, onAssignImage }: ImageSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync searchQuery helper with active item's text on open
  useEffect(() => {
    if (isOpen && item) {
      setSearchQuery(item.text);
      setCustomUrl(item.imageUrl || '');
      setError(null);
      // Automatically trigger a quick instant search
      handleSearchImages(item.text);
    }
  }, [isOpen, item]);

  const handleSearchImages = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(`/api/search-images?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Không thể tải kết quả tìm kiếm ảnh.');
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (err: unknown) {
      console.error(err);
      setError('Đã xảy ra lỗi khi tìm kiếm hình ảnh. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchImages(searchQuery);
  };

  const handleOpenGoogleImages = () => {
    if (!item) return;
    const query = searchQuery || item.text;
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
  };

  const handleSaveCustomUrl = () => {
    if (!customUrl.trim()) return;
    onAssignImage(customUrl.trim());
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Tìm &amp; Gán Hình Ảnh</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-md">Đang gán cho câu: <strong className="text-slate-800 font-semibold">"{item.text}"</strong></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-450 hover:text-slate-600 rounded-lg transition"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 overflow-y-auto space-y-6 text-left flex-1">
          {/* Section 1: Custom image URL option */}
          <div className="space-y-2 bg-slate-50 border border-slate-150/80 rounded-xl p-3.5">
            <label htmlFor="custom-img-url-input" className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest block">
              Dán URL hình ảnh trực tiếp (Từ mạng hoặc Google)
            </label>
            <div className="flex gap-2">
              <input
                id="custom-img-url-input"
                type="text"
                placeholder="Ví dụ: https://images.unsplash.com/photo-..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.75 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-700 font-sans"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveCustomUrl}
                disabled={!customUrl.trim()}
                className="bg-indigo-600 font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs px-4 py-1.75 transition shadow-3xs cursor-pointer"
              >
                Gán ảnh
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2">
              <span className="text-[10px] text-slate-400">
                Chấp nhận mọi liên kết ảnh tuyệt đối từ Google, Facebook, Unsplash, v.v.
              </span>
              <button
                type="button"
                onClick={handleOpenGoogleImages}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-center"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                Mở Google Images để tìm kiếm ↗
              </button>
            </div>
          </div>

          {/* Section 2: Quick inline search database */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Tìm nhanh miễn phí trên App</h4>
              <span className="text-[10px] text-slate-400">Truy vấn nhanh Unsplash</span>
            </div>

            <form onSubmit={onSubmitSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nhập từ khoá tiếng Anh tìm ảnh (ví dụ: 'apple', 'running boy')..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-700 font-sans focus:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-slate-100 border border-slate-200 text-slate-700 font-semibold hover:border-slate-350 px-4 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Tìm kiếm
              </button>
            </form>

            {/* Results rendering area */}
            <div className="min-h-[180px] max-h-[300px] overflow-y-auto pt-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-14 space-y-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500">Đang tải kho ảnh Unsplash...</p>
                </div>
              ) : error ? (
                <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Không tìm thấy ảnh nào cho từ khóa này.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Dùng từ tiếng Anh để tìm kiếm ảnh chính xác hơn.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => {
                        onAssignImage(img.url);
                        onClose();
                      }}
                      className="group relative h-28 border border-slate-205 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/10 transition shadow-3xs"
                    >
                      <img 
                        src={img.thumb} 
                        alt={img.author}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                        <span className="bg-white/90 text-indigo-700 font-bold text-[10px] tracking-wide uppercase px-2 py-1 rounded-md shadow-xs flex items-center gap-1 scale-95 group-hover:scale-100 transition">
                          <Check className="w-3 h-3" /> Chốt hình
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 px-2">
                        <span className="text-[8px] text-slate-305 truncate block">© {img.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-150 flex items-center justify-between text-[10px] text-slate-450">
          <span>* Mẹo nhỏ: Click chuột phải vào ảnh Google Images bất kỳ và chọn <strong>"Copy image address"</strong></span>
          <button 
            type="button" 
            onClick={onClose}
            className="font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
