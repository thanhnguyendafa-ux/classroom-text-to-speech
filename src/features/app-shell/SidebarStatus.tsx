import React from 'react';
import { Sparkles, Monitor, Key, HelpCircle } from 'lucide-react';

interface SidebarStatusProps {
  collapsed: boolean;
  engineMode: 'browser' | 'premium';
  hasPremiumKey: boolean;
  speechCount?: number;
}

export const SidebarStatus: React.FC<SidebarStatusProps> = ({
  collapsed,
  engineMode,
  hasPremiumKey,
  speechCount
}) => {
  return (
    <div className="p-3 border-t border-slate-800 text-left">
      {collapsed ? (
        <div className="flex flex-col items-center gap-3">
          {/* Engine Mode Icon with Tooltip */}
          <div className="relative group flex justify-center">
            {engineMode === 'premium' ? (
              <div className="p-1.5 bg-indigo-950/50 border border-indigo-900/60 rounded-lg text-indigo-400 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400">
                <Monitor className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="absolute left-12 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
              {engineMode === 'premium' ? 'Premium AI Engine' : 'Browser Speech Engine'}
            </div>
          </div>

          {/* Key Status Icon with Tooltip */}
          <div className="relative group flex justify-center">
            {hasPremiumKey ? (
              <div className="p-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-emerald-400">
                <Key className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="p-1.5 bg-amber-950/40 border border-amber-900/40 rounded-lg text-amber-500">
                <Key className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="absolute left-12 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
              {hasPremiumKey ? 'AI Key: Đã kết nối' : 'AI Key: Chưa có'}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Engine Selector Indicator */}
          <div>
            <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-1">Công nghệ phát âm</div>
            {engineMode === 'premium' ? (
              <div className="flex items-center space-x-1.5 bg-indigo-950/40 border border-indigo-900/40 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-300 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
                <span className="truncate">Premium AI (Gemini)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-750 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-400 font-semibold">
                <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Browser Speech (Miễn phí)</span>
              </div>
            )}
          </div>

          {/* Key status */}
          <div>
            <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-1">Kết nối Gemini API</div>
            {hasPremiumKey ? (
              <div className="flex items-center space-x-1.5 bg-emerald-950/30 border border-emerald-900/30 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-400 font-bold">
                <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">AI Key: Đã kích hoạt</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-amber-950/30 border border-amber-900/30 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-500 font-bold">
                <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">AI Key: Chưa cấu hình</span>
              </div>
            )}
          </div>

          {/* Speech Count (Optional) */}
          {typeof speechCount === 'number' && (
            <div className="text-[10px] text-slate-400/80 border-t border-slate-800/60 pt-2 flex items-center justify-between">
              <span>Bài học hiện tại:</span>
              <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded-md font-extrabold">
                {speechCount} dòng
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
