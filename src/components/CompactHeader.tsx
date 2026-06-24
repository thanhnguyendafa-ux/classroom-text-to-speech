import React from 'react';
import { 
  Volume2, 
  Sparkles, 
  Monitor, 
  Key, 
  Share2, 
  Download,
  Info,
  LogIn,
  LogOut,
  Loader2
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';

interface CompactHeaderProps {
  engineMode: 'browser' | 'premium';
  hasPremiumKey: boolean;
  speechCount: number;
  onOpenExport: () => void;
  onOpenShare: () => void;
}

export const CompactHeader: React.FC<CompactHeaderProps> = ({
  engineMode,
  hasPremiumKey,
  speechCount,
  onOpenExport,
  onOpenShare
}) => {
  const { user, isAuthLoading, signInWithGoogle, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = React.useState(false);

  return (
    <header id="compact-app-header" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Brand & Short Slogan */}
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs flex items-center justify-center shrink-0">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-snug">
                Twoway TTS <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100/50 rounded-full text-indigo-600">Pro Studio</span>
              </h1>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                Dành cho Giáo viên hằng ngày
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              Hệ thống phát âm & chính tả song ngữ - Nhập liệu nhanh dạng bảng tương tác.
            </p>
          </div>
        </div>

        {/* Status & Quick Actions Band */}
        <div className="flex items-center gap-3 flex-wrap md:justify-end">
          
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            
            {/* Engine Status */}
            {engineMode === 'premium' ? (
              <div className="flex items-center space-x-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 text-[11px] text-indigo-700 font-bold">
                <Sparkles className="w-3 h-3 text-indigo-650 animate-pulse" />
                <span>Premium AI</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 text-[11px] text-emerald-700 font-semibold">
                <Monitor className="w-3 h-3" />
                <span>Browser Speech</span>
              </div>
            )}

            {/* Key Status (only relevant if Premium engine is selected, or as a global premium helper indicator) */}
            {hasPremiumKey ? (
              <div className="flex items-center space-x-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 text-[11px] text-emerald-700 font-semibold" title="Gemini API Key đã cấu hình OK">
                <Key className="w-3 h-3 text-emerald-600" />
                <span>AI Key: OK</span>
              </div>
            ) : (
              engineMode === 'premium' && (
                <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-[11px] text-amber-800 font-semibold" title="Vui lòng nhập API Key để dùng giọng đọc chất lượng cao">
                  <Key className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>AI Key: Thiếu</span>
                </div>
              )
            )}

            {/* Speech Count Badge */}
            <div className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-600 font-semibold">
              Bài học: <strong className="text-slate-800">{speechCount} dòng</strong>
            </div>

          </div>

          {/* Quick Toolbar Actions */}
          <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
            <button
              onClick={onOpenShare}
              className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition flex items-center gap-1 cursor-pointer"
              title="Chia sẻ playlist bài học cho học sinh"
            >
              <Share2 className="w-3 h-3" />
              <span>Chia sẻ</span>
            </button>
            
            <button
              onClick={onOpenExport}
              className="text-[11px] font-bold px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Xuất bài học thành file âm thanh MP3"
            >
              <Download className="w-3 h-3" />
              <span>Xuất MP3</span>
            </button>

            {/* Google Authentication Section */}
            <div className="pl-1.5 border-l border-slate-200 flex items-center">
              {isAuthLoading ? (
                <div className="flex items-center space-x-1 px-2.5 py-1 text-[11px] text-slate-550 font-semibold bg-slate-50 rounded-lg border border-slate-100">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span>Đang tải...</span>
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 p-0.5 pr-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg transition text-slate-700 cursor-pointer text-left"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Avatar'}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-md flex items-center justify-center font-bold text-[10px]">
                        {(user.displayName || 'G')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] font-bold max-w-[80px] truncate">
                      {user.displayName?.split(' ').pop() || 'Tài khoản'}
                    </span>
                  </button>
                  
                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                      <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2.5 px-3 z-50 text-left animate-fadeIn">
                        <div className="pb-2 border-b border-slate-100 mb-2">
                          <p className="text-[11px] font-extrabold text-slate-800 truncate">{user.displayName}</p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{user.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            signOut();
                            setShowDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer text-left"
                        >
                          <LogOut className="w-3 h-3 text-rose-500" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-slate-50 border border-indigo-250 hover:border-indigo-400 rounded-lg text-indigo-700 transition flex items-center gap-1 cursor-pointer"
                  title="Đăng nhập Google để lưu trữ bài học lên cloud"
                >
                  <LogIn className="w-3 h-3 text-indigo-600" />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};

export default CompactHeader;
