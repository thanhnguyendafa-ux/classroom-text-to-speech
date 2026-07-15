import { hydrateLessonDocument } from '../../domain/lessonModel';
import type { SavedFolder, SavedLesson } from './localLibraryRepository';

export interface LocalLibrarySeed { folders: SavedFolder[]; uncategorized: SavedLesson[]; }

export function createDefaultLocalLibrarySeed(now: number): LocalLibrarySeed {
  const outerText = "sunflower\nhoa hướng dương\nbright sunflower\nhoa hướng dương rực rỡ\nI saw a bright sunflower. /1.5\nTôi đã thấy một bông hoa hướng dương rực rỡ.\nplanting sunflower seeds\ngieo hạt hoa hướng dương\nWe are planting sunflower seeds in the garden. ;2\nChúng tôi đang gieo hạt hoa hướng dương trong vườn.";
  const englishText = "popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành\nI love eating delicious popcorn. /1.5\nMình rất thích ăn bắp rang ngon lành.\nsharing popcorn\nchia sẻ bắp rang\nWe are sharing popcorn while watching a movie. ;2\nChúng mình đang chung nhau ăn bắp rang khi xem phim.";
  const chineseText = "苹果\nquả táo\n红苹果\nquả táo màu đỏ\n我喜欢吃红苹果。 /1.5\nTôi thích ăn quả táo màu đỏ.\n买新鲜苹果\nmua táo tươi ngon\n妈妈去超市买新鲜苹果。 ;2\nMẹ đi siêu thị mua táo tươi ngon.";
  const uncategorized: SavedLesson[] = [hydrateLessonDocument('lesson-seed-outer-1', { title: 'Học Tiếng Anh Giao Tiếp (Mẫu Anh-Việt)', rawText: outerText, createdAt: now - 100_000 })];
  const folders: SavedFolder[] = [{ id: 'folder-seed-v3', name: 'Khóa Học Song Ngữ Giao Tiếp', lessons: [hydrateLessonDocument('lesson-seed-nested-eng', { title: 'Tiếng Anh Du Lịch (Mẫu Anh-Việt)', rawText: englishText, createdAt: now - 50_000 }), hydrateLessonDocument('lesson-seed-nested-zho', { title: 'Tiếng Trung Giao Tiếp (Mẫu Trung-Việt)', rawText: chineseText, createdAt: now - 10_000 })], createdAt: now }];
  return { folders, uncategorized };
}
