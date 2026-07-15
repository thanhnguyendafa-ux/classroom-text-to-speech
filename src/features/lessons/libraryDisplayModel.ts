import type { LessonSettings, SpeechItem } from '../../types';

export type LibrarySource = 'local' | 'cloud';

export interface LibraryDisplayLesson {
  id: string;
  schemaVersion: 1;
  revision: number;
  title: string;
  rawText: string;
  speechList: SpeechItem[];
  settings: LessonSettings;
  createdAt: number;
  updatedAt?: number;
  folderId?: string | null;
}

export interface LibraryDisplayFolder {
  id: string;
  name: string;
  lessons: LibraryDisplayLesson[];
}

export interface LibraryDeleteTarget {
  type: 'lesson' | 'folder';
  id: string;
  title: string;
  folderId?: string;
}
