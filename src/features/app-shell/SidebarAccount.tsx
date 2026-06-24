import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, Loader2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

interface SidebarAccountProps {
  collapsed: boolean;
}

export const SidebarAccount: React.FC<SidebarAccountProps> = ({ collapsed }) => {
  const { user, isAuthLoading, signInWithGoogle, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isAuthLoading) {
    return (
      <div className="p-3 border-t border-slate-800 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-3 border-t border-slate-800">
        {collapsed ? (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-10 h-10 mx-auto flex items-center justify-center bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer relative group"
            title="Đăng nhập"
          >
            <LogIn className="w-4 h-4" />
            <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
              Đăng nhập Google
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập Google</span>
          </button>
        )}
      </div>
    );
  }

  const userInitial = (user.displayName || user.email || 'G')[0].toUpperCase();

  return (
    <div ref={dropdownRef} className="p-3 border-t border-slate-800 relative">
      {collapsed ? (
        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 hover:bg-slate-750 flex items-center justify-center transition active:scale-95 cursor-pointer group"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-extrabold text-sm text-indigo-400">{userInitial}</span>
            )}
            <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
              {user.displayName || 'Tài khoản'}
            </div>
          </button>

          {/* Collapsed Dropdown menu floating */}
          {showDropdown && (
            <div className="absolute left-14 bottom-0 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-xl py-2 px-3 z-50 animate-fadeIn">
              <div className="pb-2 border-b border-slate-800 mb-2">
                <p className="text-[11px] font-bold text-white truncate">{user.displayName}</p>
                <p className="text-[9px] text-slate-400 truncate mt-0.5">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rose-400 hover:bg-rose-950/30 rounded-lg font-bold transition cursor-pointer text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex-1 flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/60 transition text-left cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-750 bg-slate-800 shrink-0 flex items-center justify-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-xs text-indigo-400">{userInitial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white truncate leading-tight">
                  {user.displayName}
                </p>
                <p className="text-[9px] text-slate-400 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition shrink-0 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {showDropdown && (
            <div className="absolute left-3 right-3 bottom-14 bg-slate-950 border border-slate-800 rounded-xl shadow-xl p-2.5 z-50 animate-fadeIn text-left">
              <div className="pb-2 border-b border-slate-800 mb-1.5">
                <p className="text-[10px] text-slate-400">Đang đăng nhập bằng</p>
                <p className="text-[11px] font-bold text-white truncate mt-0.5">{user.displayName}</p>
                <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rose-400 hover:bg-rose-950/30 rounded-lg font-bold transition cursor-pointer text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
