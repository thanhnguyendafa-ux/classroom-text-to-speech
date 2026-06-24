import React from 'react';
import { Volume2, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

export const MobileAppTopBar: React.FC = () => {
  const { user, isAuthLoading, signInWithGoogle, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = React.useState(false);

  return (
    <header id="mobile-app-topbar" className="lg:hidden h-12 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs flex items-center justify-between px-4">
      {/* Brand & Slogan */}
      <div className="flex items-center space-x-2">
        <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-xs shrink-0">
          <Volume2 className="h-4 w-4" />
        </div>
        <span className="font-extrabold text-sm text-slate-900 tracking-tight">
          Twoway Studio
        </span>
      </div>

      {/* Account actions on Mobile */}
      <div className="flex items-center">
        {isAuthLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        ) : user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg transition text-slate-700 cursor-pointer text-left"
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
              <span className="text-[10px] font-bold max-w-[70px] truncate">
                {user.displayName?.split(' ').pop() || 'Tài khoản'}
              </span>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-2 px-3 z-50 text-left animate-fadeIn">
                  <div className="pb-1.5 border-b border-slate-100 mb-1.5">
                    <p className="text-[10px] font-bold text-slate-800 truncate">{user.displayName}</p>
                    <p className="text-[8px] text-slate-500 truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 py-1 text-[10px] text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-slate-50 border border-indigo-200 hover:border-indigo-400 rounded-lg text-indigo-700 transition flex items-center gap-1 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default MobileAppTopBar;
