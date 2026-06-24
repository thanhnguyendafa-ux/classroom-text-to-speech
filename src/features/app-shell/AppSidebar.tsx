import React from 'react';
import { 
  BookOpen, 
  PencilLine, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Volume2
} from 'lucide-react';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeSection: 'lessons' | 'builder';
  onSectionChange: (section: 'lessons' | 'builder') => void;
  onCreateNewLesson?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapsed,
  activeSection,
  onSectionChange,
  onCreateNewLesson
}) => {
  return (
    <aside 
      id="app-sidebar-desktop"
      className={`hidden lg:flex flex-col h-[calc(100vh-65px)] bg-slate-900 border-r border-slate-850 text-slate-300 transition-all duration-300 shrink-0 sticky top-[65px] ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 select-none">
            <Volume2 className="h-5 w-5 text-indigo-400 shrink-0" />
            <span className="font-extrabold text-sm text-white tracking-wide">Twoway Studio</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <Volume2 className="h-5 w-5 text-indigo-400" />
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer hidden lg:block"
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {/* "+ Tạo bài mới" Quick Action Button */}
        {!collapsed ? (
          <button
            type="button"
            onClick={onCreateNewLesson}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer mb-4"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài học mới</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreateNewLesson}
            className="w-10 h-10 mx-auto flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-98 cursor-pointer mb-4"
            title="Tạo bài mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Tab "Bài học" */}
        <button
          type="button"
          onClick={() => onSectionChange('lessons')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group cursor-pointer ${
            activeSection === 'lessons'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className={`w-4 h-4 shrink-0 ${activeSection === 'lessons' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
          {!collapsed && <span>Bài học của tôi</span>}
          {collapsed && (
            <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
              Bài học của tôi
            </div>
          )}
        </button>

        {/* Tab "Tạo bài học" */}
        <button
          type="button"
          onClick={() => onSectionChange('builder')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group cursor-pointer ${
            activeSection === 'builder'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <PencilLine className={`w-4 h-4 shrink-0 ${activeSection === 'builder' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
          {!collapsed && <span>Tạo bài học</span>}
          {collapsed && (
            <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
              Tạo bài học
            </div>
          )}
        </button>
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Twoway TTS Pro &copy; 2026
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
