import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { BookOpen, PencilLine, Plus } from 'lucide-react';

interface AppShellProps {
  activeSection: 'lessons' | 'builder';
  onSectionChange: (section: 'lessons' | 'builder') => void;
  onCreateNewLesson: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeSection,
  onSectionChange,
  onCreateNewLesson,
  children
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div id="app-shell-root" className="min-h-screen flex flex-col bg-slate-50">
      
      {/* Top Main Work Area */}
      <div className="flex-1 flex flex-row relative">
        
        {/* Desktop Sidebar (hidden on mobile) */}
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          onCreateNewLesson={onCreateNewLesson}
        />

        {/* Primary View Area */}
        <main 
          id="app-shell-content" 
          className="flex-1 min-w-0 px-4 py-6 sm:px-6 md:px-8 overflow-y-auto pb-24 lg:pb-8 text-left"
        >
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible only on screens below lg) */}
      <div 
        id="mobile-bottom-nav" 
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shadow-lg"
      >
        {/* Tab Bài học */}
        <button
          type="button"
          onClick={() => onSectionChange('lessons')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeSection === 'lessons'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-extrabold">Bài học</span>
        </button>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={() => {
            onCreateNewLesson();
            onSectionChange('builder');
          }}
          className="w-12 h-12 -mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer border-4 border-white"
          title="Tạo bài học mới"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Tab Tạo bài học */}
        <button
          type="button"
          onClick={() => onSectionChange('builder')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeSection === 'builder'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PencilLine className="w-5 h-5" />
          <span className="text-[10px] font-extrabold">Tạo bài</span>
        </button>
      </div>

    </div>
  );
};

export default AppShell;
