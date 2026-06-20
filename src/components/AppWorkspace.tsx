import React, { useState } from 'react';
import { 
  FileText, 
  List, 
  Sliders, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AppWorkspaceProps {
  leftColumn: React.ReactNode;   // Nhập bài, Lesson library, GPT prompt
  centerColumn: React.ReactNode; // Danh sách câu, Classroom drill tips
  rightColumn: React.ReactNode;  // Cấu hình giọng, Universal theme, Chrome hints
  speechCount: number;
}

export const AppWorkspace: React.FC<AppWorkspaceProps> = ({
  leftColumn,
  centerColumn,
  rightColumn,
  speechCount
}) => {
  // Mobile / Tablet tab selector state
  // Tabs: 'input' | 'list' | 'settings'
  const [activeTab, setActiveTab] = useState<'input' | 'list' | 'settings'>('input');

  return (
    <div id="app-workspace-container" className="w-full">
      
      {/* MOBILE & TABLET PORTRAIT TAB NAVIGATION (hidden on lg and above) */}
      <div className="lg:hidden mb-4 bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-between sticky top-16 z-30 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('input')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'input'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Nhập bài</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'list'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Danh sách</span>
          {speechCount > 0 && (
            <span className={`text-[10px] ml-1 font-extrabold px-1.5 py-0.2 rounded-full ${
              activeTab === 'list' ? 'bg-indigo-850 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {speechCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Cấu hình</span>
        </button>
      </div>

      {/* DESKTOP 3-COLUMN WORKSPACE GRID (from 'lg' breakpoint upward) */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(280px,0.85fr)_minmax(420px,1.45fr)_minmax(300px,0.9fr)] lg:gap-4 items-start w-full">
        {/* Left Column: Input Panel & Libraries */}
        <div id="desktop-workspace-left" className="space-y-4">
          {leftColumn}
        </div>

        {/* Center Column: List Queue & Drill Guidelines */}
        <div id="desktop-workspace-center" className="space-y-4">
          {centerColumn}
        </div>

        {/* Right Column: Settings & Theme Backgrounds */}
        <div id="desktop-workspace-right" className="space-y-4">
          {rightColumn}
        </div>
      </div>

      {/* MOBILE RESPONSIVE VIEWER (renders only active tab beneath 'lg' breakpoint) */}
      <div className="lg:hidden w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="mobile-tab-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 text-left"
            >
              {leftColumn}
            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div
              key="mobile-tab-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 text-left"
            >
              {centerColumn}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="mobile-tab-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 text-left"
            >
              {rightColumn}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default AppWorkspace;
