import React from 'react';
import { useAuth } from './useAuth';
import { Volume2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, signInWithGoogleRedirect, isAuthLoading, error, canUseRedirectFallback } = useAuth();

  return (
    <div id="login-screen" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Container card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Brand & Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-md justify-center items-center">
            <Volume2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
              Twoway TTS <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100/50 rounded-full text-indigo-600">Pro Studio</span>
            </h1>
            <p className="text-xs text-indigo-650 font-bold tracking-wide uppercase">
              Dành cho giáo viên hằng ngày
            </p>
          </div>
        </div>

        {/* Info/Benefits Block */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-3">
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Đăng nhập để tiếp tục
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Lưu bài học, mở lại giáo án và luyện nghe trên mọi thiết bị thuận tiện hơn bao giờ hết.
          </p>
          
          <ul className="space-y-2 pt-1">
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-semibold">Lưu trữ bài học đám mây tự động</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-semibold">Mở lại bài cũ từ thư viện giáo án</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-semibold">Chia sẻ bài luyện phát âm cho học sinh</span>
            </li>
          </ul>
        </div>

        {/* Authentication Button Section */}
        <div className="space-y-3">
          <button
            id="google-signin-btn"
            onClick={signInWithGoogle}
            disabled={isAuthLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 disabled:bg-slate-50 border border-slate-250 hover:border-slate-400 rounded-xl font-bold text-slate-700 shadow-2xs hover:shadow-xs transition duration-150 cursor-pointer disabled:cursor-not-allowed"
          >
            {isAuthLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Tiếp tục với Google</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center font-medium">
            Đăng nhập hoặc đăng ký bằng tài khoản Google.
          </p>
          {canUseRedirectFallback && (
            <button
              type="button"
              onClick={signInWithGoogleRedirect}
              disabled={isAuthLoading}
              className="w-full py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
            >
              Đăng nhập bằng chuyển hướng
            </button>
          )}
        </div>

        {/* Support instructions / Footer notice */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            <span className="font-bold text-slate-500">Đang dùng tài khoản trường/lớp học?</span>
            <br />
            Hãy chọn đúng tài khoản Google được cấp khi đăng nhập để đồng bộ giáo án.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div id="auth-error-alert" className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 animate-fadeIn font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="space-y-0.5">
              <p className="font-extrabold">Lỗi đăng nhập:</p>
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginScreen;
