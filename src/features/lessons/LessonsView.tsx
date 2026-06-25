import React from 'react';
import LessonLibrary, { SavedLesson } from '../../components/LessonLibrary';
import { SpeechItem, LessonSettings } from '../../types';
import { BookOpen } from 'lucide-react';

interface LessonsViewProps {
  currentRawText: string;
  currentSpeechList: SpeechItem[];
  currentSettings: LessonSettings;
  onLoadLesson: (lesson: SavedLesson) => void;
  cloudRefreshVersion?: number;
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  currentRawText,
  currentSpeechList,
  currentSettings,
  onLoadLesson,
  cloudRefreshVersion
}) => {
  return (
    <div id="lessons-view-container" className="max-w-5xl mx-auto space-y-6">
      {/* Upper header segment */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Bài học của tôi</h2>
          <p className="text-xs text-slate-500">Tìm kiếm, lọc thư mục và tải các bài học đã chuẩn bị</p>
        </div>
      </div>

      {/* Main library panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6">
          <LessonLibrary
            currentRawText={currentRawText}
            currentSpeechList={currentSpeechList}
            currentSettings={currentSettings}
            onLoadLesson={onLoadLesson}
            cloudRefreshVersion={cloudRefreshVersion}
          />
        </div>
      </div>
    </div>
  );
};

export default LessonsView;
