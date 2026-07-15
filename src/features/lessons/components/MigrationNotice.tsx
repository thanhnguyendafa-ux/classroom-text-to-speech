import React from 'react';
import type { User } from 'firebase/auth';
import { ArrowUpFromLine, Laptop, Cloud, Loader2 } from 'lucide-react';

interface MigrationNoticeProps {
  activeTab: 'local' | 'cloud';
  user: User | null;
  localFoldersCount: number;
  localLessonsCount: number;
  isCloudLoading: boolean;
  handleMigrateLocalToCloud: () => Promise<void>;
  showMigrationBanner: boolean;
  setShowMigrationBanner: (show: boolean) => void;
}

export const MigrationNotice: React.FC<MigrationNoticeProps> = ({
  activeTab,
  user,
  localFoldersCount,
  localLessonsCount,
  isCloudLoading,
  handleMigrateLocalToCloud,
  showMigrationBanner,
  setShowMigrationBanner,
}) => {
  const hasLocalData = localFoldersCount > 0 || localLessonsCount > 0;

  if (activeTab === 'local') {
    return (
      <div id="local-tab-warning" className="bg-amber-50/60 border border-amber-200/60 px-3 py-2 rounded-xl mb-3 text-[11px] animate-fadeIn">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <Laptop className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-amber-800 font-medium truncate">
              Bản nháp lưu tạm trên trình duyệt máy này. Hãy chuyển lên đám mây để tránh mất dữ liệu.
            </span>
          </div>
          {user && hasLocalData && (
            <button
              type="button"
              id="migrate-local-btn"
              onClick={handleMigrateLocalToCloud}
              disabled={isCloudLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              {isCloudLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Cloud className="w-3 h-3" />
              )}
              <span>Chuyển tất cả lên đám mây</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'cloud' && user && hasLocalData && showMigrationBanner) {
    return (
      <div id="cloud-migrate-alert" className="bg-indigo-50/70 border border-indigo-100 px-3 py-2 rounded-xl mb-3 text-[11px] animate-fadeIn">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-700 font-medium truncate">
              Phát hiện <strong className="text-indigo-700">{localFoldersCount} thư mục</strong> & <strong className="text-indigo-700">{localLessonsCount} bài học</strong> trên máy này chưa đồng bộ.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="sync-now-btn"
              onClick={handleMigrateLocalToCloud}
              disabled={isCloudLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs text-[10px]"
            >
              {isCloudLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Cloud className="w-3 h-3" />
              )}
              <span>Đồng bộ ngay</span>
            </button>
            <button
              type="button"
              id="dismiss-banner-btn"
              onClick={() => setShowMigrationBanner(false)}
              className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold px-1 py-1"
            >
              Ẩn
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
