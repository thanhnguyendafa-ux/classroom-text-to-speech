import React from 'react';
import { Volume2, Loader2 } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div id="auth-loading-screen" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg animate-pulse">
          <Volume2 className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Twoway TTS</h2>
          <p className="text-xs text-slate-500 font-medium">Pro Studio cho giáo viên</p>
        </div>
        <div className="flex items-center space-x-2 text-indigo-700 bg-indigo-50 border border-indigo-100/80 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xs">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
          <span>Đang kiểm tra phiên đăng nhập...</span>
        </div>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;
